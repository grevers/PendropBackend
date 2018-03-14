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
      image: faker.image.imageUrl(400,400,"people"),
      groups: [],
      friends: [],
      todos: [],
      password: password,
	  pushToken: 'ExponentPushToken[9GgsmYFuKeivuscb1D4Dd9]'
    };
    user.groups.push(group);
    Users.push(user);
    group.users.push(user);
  });
  Users.forEach((user) => {
    console.log(
      '{email, username, password, pushToken}',
      `{${user.email}, ${user.username}, ${user.password}, ${user.pushToken}`
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
      group.messages.push(message.id);
    });

    _.times(TODOS_PER_USER, () => {
      let todo = {
        id: (Math.floor(Math.random()*100)+300).toString(16),
        title: faker.lorem.words(2),
        text: faker.lorem.words(5),
        assignees: group.id,
        sharedTo: group.id,
        dueDate: new Date(),
        completed: false,
      };
      user.todos.push(todo);
      group.todos.push(todo);
      Todos.push(todo);
    });
  })
})

_.each(Users, (current, j) => {
  _.each(Users, (user, k) => {
    if (j !== k) {
      current.friends.push(user);
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
      let ret = [];
      Messages.forEach(res => {
        if (res.to === groupId || res.from === userId) {
          ret.push(res);
        }
      });
      ret.sort(function(a,b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      return ret;
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
        to: groupId,
        from: userId,
        text: text,
        createdAt: new Date(),
      };
      Messages.push(message);
      return message;
    },

    markTodo(root, {id}) {
      function isId(todo) {
        if (todo.id === id) {
          todo.completed = !todo.completed;
        }
        return todo.id === id;
      };
      return Todos.find(isId)
    },

    login(root, {email,password}) {
      function verify(user) {
        if (user.email === email) {
          return user.password === password
        }
      }
      return Users.find(verify);
    },

    signup(root, {email,password}) {
      function exists(user) {
        if (user.email === email) {
          return user.password === password
        }
      }
      if (!Users.find(verify)) {
        let user = {
          id: (Math.floor(Math.random()*100)+20).toString(16),
          email: email,
          username: faker.internet.userName(),
          image: faker.image.imageUrl(400,400,"people"),
          groups: [],
          friends: [],
          todos: [],
          password: password,
        };
        Users.push(user);
      }
    }
  },
  Group: {
    users(group) {
      Users.filter(user => user.groups.includes(group.id));
      return group.users;
    },
    messages(group) {
      let ret = Messages.filter(message => message.to === group.id);
      ret.sort(function(a,b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      return ret;
    },
  },
  Message: {
    to(message) {
      function isId(group) {
        return group.id === message.to;
      }
      return Groups.find(isId);
    },
    from(message) {
      function isId(user) {
        return user.id === message.from;
      }
      return Users.find(isId);
    },
  },
  todo: {
    assignees(todo) {
      function isId(group) {
        return group.id === todo.assignees;
      }
      return Groups.find(isId);
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
      return Messages.filter(message => message.from === user.id);
    },
    groups(user) {
      let ret = [];
      user.groups.forEach(res => {
        ret = ret.concat(Groups.filter(group => group.id === res));
      })
      return user.groups;
    },
    friends(user) {
      Users.filter(other => user.friends.includes(other.id));
      return user.friends;
    },
    todos(user) {
      let ret = [];
      user.todos.forEach(res => {
        //console.log(Todos.filter(todo => todo.id === res));
        ret = ret.concat(Todos.filter(todo => todo.id === res));
      });
      return user.todos;
    },
  },
}
