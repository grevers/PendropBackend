import faker from 'faker';
import { _ } from 'lodash';

import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';

const Groups = [];
const Users = [];
const Messages = [];
const Todos = [];

faker.seed(123);


const GROUPS = 1;
const USERS_PER_GROUP = 2;
const MESSAGES_PER_USER = 2;
const TODOS_PER_USER = 2;

_.times(GROUPS, () => {
  var i = 1;
  let group = {
    id: i.toString(),
    name: faker.lorem.words(3),
    users: [],
    messages: [],
    todos: [],
  };
  i++;

  Groups.push(group);
});

Groups.forEach((group) => {
  _.times(USERS_PER_GROUP, () => {
    const password = faker.internet.password();
    let user = {
      id: (Math.floor(Math.random()*100)+20).toString(16),
      email: faker.internet.email(),
      username: faker.internet.userName(),
      messages: [],
      groups: [],
      friends: [],
      todos: [],
      password: password,
    };
    user.groups.push(group.id);
    Users.push(user);
    group.users.push(user);
  });
  Users.forEach((user) => {
    console.log(
      '{email, username, password}',
      `{${user.email}, ${user.username}, ${user.password}}`
    );
    _.times(MESSAGES_PER_USER, () => {
      let message = {
        id: (Math.floor(Math.random()*100)+200).toString(16),
        text: faker.lorem.sentences(3),
        createdAt: new Date(),
        from: user.id,
        to: group.id,
      };
      // TODO: Try deleting these fields below and see if they are necessary.
      message.groupId = group.id;
      message.userId = user.id;
      Messages.push(message);
    });

    Messages.forEach((message) => {
      user.messages.push(message.id);
      group.messages.push(message.id);
    });

    _.times(TODOS_PER_USER, () => {
      let todo = {
        id: (Math.floor(Math.random()*100)+300).toString(16),
        text: faker.lorem.words(5),
        assignees: [],
        sharedTo: group.id,
        dueDate: new Date(),
        completed: false,
      };
      todo.assignees.push(user.id);
      user.todos.push(todo.id);
      group.todos.push(todo.id);
      Todos.push(todo);
    });
  })
})

_.each(Users, (current, j) => {
  _.each(Users, (user, k) => {
    if (j !== k) {
      current.friends.push(user.id);
    }
  });
});

export const MockResolvers = {
  Date: new GraphQLScalarType({
        name: 'Date',
        description: 'Date type',
        parseValue(value) {
            // value comes from the client, in variables
            validateValue(value);
            return new Date(value); // sent to resolvers
        },
        parseLiteral(ast) {
            // value comes from the client, inlined in the query
            if (ast.kind !== Kind.STRING) {
                throw new GraphQLError(`Query error: Can only parse dates strings, got a: ${ast.kind}`, [ast]);
            }
            validateValue(ast.value);
            return new Date(ast.value); // sent to resolvers
        },
        serialize(value) {
            // value comes from resolvers
            return value.toISOString(); // sent to the client
        },
  }),
  Query: {
    group(root, {groupId}) {
      function isId(group) {
        return group.id === groupId;
      }
      return Groups.find(isId);
    },
    messages(root, {groupId,userId}) {
      return find(Messages, [{groupId:groupId} || {userId:userId}]);
    },
    user(root, {id,email}) {
      function isIdorEmail(user) {
        return user.id === id || user.email === email;
      }
      return Users.find(isIdorEmail);
    },
    todo(root,{id}) {
      function isId(todo) {
        return todo.id === id;
      }
      return Todos.find(isId);
    },
  },
  Mutation: {
    createMessage(root, { text, userId, groupId }) {
      let message = {
        id: (Math.floor(Math.random()*100)+200).toString(16),
        text: text,
        createdAt: new Date(),
        from: userId,
        to: groupId,
      };
      Messages.push(message);
      return message;
    }
  },
  Group: {
    users(group) {
      return Users.filter(user => user.groups.includes(group.id))
    },
    messages(group) {
      return Messages.filter(message => message.groupId === group.id);
    },
  },
  Message: {
    to(message) {
      function isId(group) {
        return group.id === message.groupId;
      }
      return Groups.find(isId);
    },
    from(message) {
      function isId(user) {
        return user.id === message.userId;
      }
      return Users.find(isId);
    },
  },
  todo: {
    assignees(todo) {
      return Users.filter(user => user.todos.includes(todo.id));
    },
    sharedTo(todo) {
      function isId(group) {
        return group.id === todo.sharedTo;
      }
      return Groups.find(isId);
    },
  },
  User: {
    messages(user) {
      return Messages.filter(message => message.userId === user.id);
    },
    groups(user) {
      return Groups.filter(group => group.users.includes(user.id));
    },
    friends(user) {
      return Users.filter(other => user.friends.includes(other.id));
    },
    todos(user) {
      return Todos.filter(todo => todo.assignees.includes(user.id));
    },
  },
};
