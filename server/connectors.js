import faker from 'faker';
import { _ } from 'lodash';

import mongoose from 'mongoose';

mongoose.Promise = require('bluebird');

mongoose.connect('mongodb://localhost:27017/pendrop', {
  useMongoClient: true,
});

var db = mongoose.connection

db.on('error', ()=> {
  console.log(' ---Failed to connect to mongoose--- ')
});

db.once('open', () => {
  console.log(' +++Connected to mongoose+++ ');
});


// TODO: Add toPlainObject method for each schema so only needed data is sent to client

var Schema = mongoose.Schema;

var groupSchema = new Schema({
  name: String,
  users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  messages: [{ type: Schema.Types.ObjectId, ref: 'Message' }],
  todos: [{ type: Schema.Types.ObjectId, ref: 'Todo' }]
}, { collection: 'Groups' ,strict: false,minimize: false});

var messageSchema = new Schema({
  text: String,
  to: { type: Schema.Types.ObjectId, ref: 'Group' },
  from: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'Messages',strict: false,minimize: false });

var userSchema = new Schema({
  email: String,
  username: String,
  password: String,
  messages: [{ type: Schema.Types.ObjectId, ref: 'Message' }],
  groups: [{ type: Schema.Types.ObjectId, ref: 'Group' }],
  friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  todos: [{ type: Schema.Types.ObjectId, ref: 'Todo' }]
}, { collection: 'Users',strict: false,minimize: false });

var todoSchema = new Schema({
  text: String,
  assignees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  sharedTo: { type: Schema.Types.ObjectId, ref: 'Group' },
  dueDate: { type: Date, default: Date.now },
  completed: Boolean
}, { collection: 'Todos',strict: false,minimize: false });

export var Group = mongoose.model('Group', groupSchema);
export var Message = mongoose.model('Message', messageSchema);
export var User = mongoose.model('User', userSchema);
export var Todo = mongoose.model('Todo', todoSchema);

// TODO: Remove this when finished with testing

faker.seed(123);

const GROUPS = 1;
const USERS_PER_GROUP = 5;
const MESSAGES_PER_USER = 5;
const TODOS_PER_USER = 2;

_.times(GROUPS, () => {
  Group.create({
    name: faker.lorem.words(3),
  }).then(group => _.times(USERS_PER_GROUP, () => {
    const password = faker.internet.password();
    return group.model('User').create({
      email: faker.internet.email(),
      username: faker.internet.userName(),
      password,
    }).then((user) => {
      console.log(
        '{email, username, password}',
        `{${user.email}, ${user.username}, ${password}}`
      );
      _.times(MESSAGES_PER_USER, () => Message.create({
        text: faker.lorem.sentences(3),
        from: user._id,
        to: group._id,
      }).then((message) => {
        // TODO: Try deleting these fields below and see if they are necessary.
        message.set('groupId', group._id);
        message.set('userId', user._id);
        message.save();
        user.messages.addToSet(message._id);
        user.save();
        group.messages.addToSet(message._id);
        group.save();
      }));
      _.times(TODOS_PER_USER, () => Todo.create({
        text: faker.lorem.words(5),
        assignees: group._id,
        sharedTo: group._id,
        completed: false
      }).then((todo) => {
        todo.assignees.addToSet(user._id);
        todo.save();
        user.todos.addToSet(todo);
        user.save();
        group.todos.addToSet(todo);
        group.save();
      }));
      user.groups.addToSet(group._id);
      user.save();
      group.users.addToSet(user._id);
      group.save();
      return user;
    });
  })).then((userPromises) => {
    Promise.all(userPromises).then((users) => {
      _.each(users, (current, i) => {
        _.each(users, (user, j) => {
          if (i !== j) {
            current.friends.addToSet(user._id);
            current.save();
          }
        })
      })
    })
  })
});
