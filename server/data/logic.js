import { Group, Message, Todo, User } from '../connectors';

// reusable function to check for a user with context
function getAuthenticatedUser(ctx) {
  return ctx.user.then((user) => {
    if (!user) {
      return Promise.reject('Unauthorized');
    }
    return user;
  });
}

export const messageLogic = {
  from(message) {
    return Message.findById(message.id).populate('from').exec()
    .then((message) => {
      return message.from;
    })
  },
  to(message) {
    return Message.findById(message.id).populate('to').exec()
      .then((messsage) => {
        return message.to;
    })
  },
  createMessage(_, { text, groupId }, ctx) {
    return getAuthenticatedUser(ctx)
      .then(user => User.findOne({'groups.id': groupId}).exec()
        .then((group) => {
          if (group.length) {
            return Message.create({
              text: text,
              userId: user.id,
              groupId,
            });
          }
          return Promise.reject('Unauthorized');
        }));
  },
};

export const todoLogic = {
  assignees(todo) {
    return Todo.findById(todo.id).populate('assignees').exec()
    .then((todo) => {
      return todo.assignees;
    });
  },
  sharedTo(todo) {
    return Todo.findById(todo.id).populate('sharedTo').exec()
    .then((todo) => {
      return todo.sharedTo;
    });
  },
};

export const groupLogic = {
  users(group) {
    return Group.findById(group.id).populate('users').exec()
    .then((group) => {
      return group.users;
    })
  },
  messages(group, { first, last, before, after }) {
    // base query -- get messages from the right group
    const where = { groupId: group.id };

    // because we return messages from newest -> oldest
    // before actually means newer (date > cursor)
    // after actually means older (date < cursor)

    if (before) {
      // convert base-64 to utf8 iso date and use in Date constructor
      where.id = { $gt: Buffer.from(before, 'base64').toString() };
    }

    if (after) {
      where.id = { $lt: Buffer.from(after, 'base64').toString() };
    }

    return Message.findAll({
      where,
      order: [['id', 'DESC']],
      limit: first || last,
    }).then((messages) => {
      const edges = messages.map(message => ({
        cursor: Buffer.from(message.id.toString()).toString('base64'), // convert createdAt to cursor
        node: message, // the node is the message itself
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage() {
            if (messages.length < (last || first)) {
              return Promise.resolve(false);
            }

            return Message.findOne({
              where: {
                groupId: group.id,
                id: {
                  [before ? '$gt' : '$lt']: messages[messages.length - 1].id,
                },
              },
              order: [['id', 'DESC']],
            }).then(message => !!message);
          },
          hasPreviousPage() {
            return Message.findOne({
              where: {
                groupId: group.id,
                id: where.id,
              },
              order: [['id']],
            }).then(message => !!message);
          },
        },
      };
    });
  },
  query(_, { id }, ctx) {
    return getAuthenticatedUser(ctx).then(user => Group.findOne({
      where: { id },
      include: [{
        model: User,
        where: { id: user.id },
      }],
    }));
  },
  createGroup(_, { name, userIds }, ctx) {
    return getAuthenticatedUser(ctx)
      .then(user => user.getFriends({ where: { id: { $in: userIds } } })
        .then((friends) => { // eslint-disable-line arrow-body-style
          return Group.create({
            name,
          }).then((group) => { // eslint-disable-line arrow-body-style
            return group.users.push([user, ...friends]).then(() => {
              group.users = [user, ...friends];
              return group;
            });
          });
        }));
  },
  deleteGroup(_, { id }, ctx) {
    return getAuthenticatedUser(ctx).then((user) => { // eslint-disable-line arrow-body-style
      return Group.findOne({
        where: { id },
        include: [{
          model: User,
          where: { id: user.id },
        }],
      }).then(group => group.users
        .then(users => group.users.remove())
        .then(() => Message.findOneAndRemove({ groupId: group.id }))
        .then(() => group.remove()))
    });
  },
  leaveGroup(_, { id }, ctx) {
    return getAuthenticatedUser(ctx).then((user) => {
      if (!user) {
        return Promise.reject('Unauthorized');
      }

      return Group.findOne({
        where: { id },
        include: [{
          model: User,
          where: { id: user.id },
        }],
      }).then((group) => {
        if (!group) {
          Promise.reject('No group found');
        }

        return group.findOneAndRemove({id: user.id})
          .then(() => group.users)
          .then((users) => {
            // if the last user is leaving, remove the group
            if (!users.length) {
              group.remove();
            }
            return { id };
          });
      });
    });
  },
  updateGroup(_, { id, name }, ctx) {
    return getAuthenticatedUser(ctx).then((user) => { // eslint-disable-line arrow-body-style
      return Group.findOne({
        where: { id },
        include: [{
          model: User,
          where: { id: user.id },
        }],
      }).then(group => group.update({ name }));
    });
  },
};

export const userLogic = {
  email(user, args, ctx) {
    return getAuthenticatedUser(ctx).then((currentUser) => {
      if (currentUser.id === user.id) {
        return currentUser.email;
      }

      return Promise.reject('Unauthorized');
    });
  },
  friends(user, args, ctx) {
    return getAuthenticatedUser(ctx).then((currentUser) => {
      if (currentUser.id !== user.id) {
        return Promise.reject('Unauthorized');
      }

      return User.findById(user.id).populate('friends').exec()
      .then((user) => {
        return user.friends;
      });
    });
  },
  groups(user, args, ctx) {
    return getAuthenticatedUser(ctx).then((currentUser) => {
      if (currentUser.id !== user.id) {
        return Promise.reject('Unauthorized');
      }

      return User.findById(user.id).populate('groups').exec()
      .then((user) => {
        return user.groups;
      });
    });
  },
  todos(user, args, ctx) {
    return getAuthenticatedUser(ctx).then((currentUser) => {
      if (currentUser.id !== user.id) {
        return Promise.reject('Unauthorized');
      }

      return User.findById(user.id).populate('todos').exec()
      .then((user) => {
        return user.todos;
      });
    });
  },
  jwt(user) {
    return Promise.resolve(user.jwt);
  },
  messages(user, args, ctx) {
    return getAuthenticatedUser(ctx).then((currentUser) => {
      if (currentUser.id !== user.id) {
        return Promise.reject('Unauthorized');
      }

      return User.findById(user.id).populate('messages').exec()
      .then((user) => {
        return user.messages;
      });
    });
  },
  query(_, args, ctx) {
    return getAuthenticatedUser(ctx).then((user) => {
      if (user.id === args.id || user.email === args.email) {
        return user;
      }

      return Promise.reject('Unauthorized');
    });
  },
};

export const subscriptionLogic = {
  groupAdded(baseParams, args, ctx) {
    return getAuthenticatedUser(ctx)
      .then((user) => {
        if (user.id !== args.userId) {
          return Promise.reject('Unauthorized');
        }

        baseParams.context = ctx;
        return baseParams;
      });
  },
  messageAdded(baseParams, args, ctx) {
    return getAuthenticatedUser(ctx)
      .then(user => user.findOne({ 'groups.id': args.groupIds })
      .then((groups) => {
        // user attempted to subscribe to some groups without access
        if (args.groupIds.length > groups.length) {
          return Promise.reject('Unauthorized');
        }

        baseParams.context = ctx;
        return baseParams;
      }));
  },
};
