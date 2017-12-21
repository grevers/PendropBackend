import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';
import mongoose from 'mongoose';

mongoose.Promise = require("bluebird");

import { Group, Message, User, Todo } from './connectors';

export const Resolvers = {
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
      return Group.findById(groupId);
    },
    messages(root, {groupId,userId}) {
      return Message.find({ $or: [{'groupId': groupId},{'userId': userId}]});
    },
    user(root, {id,email}) {
      return User.findOne({ $or: [ { 'email': email}, {'_id': id} ] });
    },
    todo(root,{id}) {
      return Todo.findById(id);
    },
  },
  Mutation: {
    createMessage(root, { text, userId, groupId }) {
      return Message.create({
        text: text,
        from: userId,
        to: groupId,
      }).then((message) => {
        return message
      })
    }
  },
  Group: {
    users(group) {
      return Group.findById(group.id).populate('users').exec()
      .then((group) => {
        return group.users;
      })
    },
    messages(group) {
      return Group.findById(group.id).populate('messages').exec()
      .then((group) => {
        return group.messages;
      })
    },
  },
  Message: {
    to(message) {
      return Message.findById(message.id).populate('to').exec()
        .then((messsage) => {
          return message.to;
      })
    },
    from(message) {
      return Message.findById(message.id).populate('from').exec()
      .then((message) => {
        return message.from;
      })
    },
  },
  todo: {
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
  },
  User: {
    messages(user) {
      return User.findById(user.id).populate('messages').exec()
      .then((user) => {
        return user.messages;
      })
    },
    groups(user) {
      return User.findById(user.id).populate('groups').exec()
      .then((user) => {
        return user.groups;
      });
    },
    friends(user) {
      return User.findById(user.id).populate('friends').exec()
      .then((user) => {
        return user.friends;
      });
    },
    todos(user) {
      return User.findById(user.id).populate('todos').exec()
      .then((user) => {
        return user.todos;
      });
    },
  },
};
