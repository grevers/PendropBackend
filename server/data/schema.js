import { addMockFunctionsToSchema, makeExecutableSchema } from 'graphql-tools';
//import { Mocks } from './mocks';
import { Resolvers } from '../resolvers';
import { MockResolvers } from '../mockResolvers';

const schema = [`
  # declare custom scalars
  scalar Date

  type MessageConnection {
    edges: [MessageEdge]
    pageInfo: PageInfo!
  }
  type MessageEdge {
    cursor: String!
    node: Message!
  }
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  # a group chat entity
  type Group {
    id: ID!            # unique id for the group
    name: String        # name of the group
    users: [User]!      # users in the group
    messages: [Message] # messages sent to the group
    todos: [todo]
  }
  # a user -- keep type really simple for now
  type User {
    id: ID!         # unique id for the user
    email: String!      # we will also require a unique email per user
    username: String    # this is the name we'll show other users
    messages: [Message] # messages sent by user
    groups: [Group]     # groups the user belongs to
    friends: [User]     # user's friends/contacts
    todos: [todo]       # user's todo list
    jwt: String         # json web token for access
  }
  # a message sent from a user to a group
  type Message {
    id: ID!            # unique id for message
    to: Group        # group message was sent in
    from: User       # user who sent the message
    text: String!     # message text
    createdAt: Date!  # when message was created
  }
  # todo item
  type todo {
    id: ID!
    title: String
    text: String
    assignees: Group
    sharedTo: Group
    dueDate: Date
    completed: Boolean
  }

  # query for types
  type Query {
    # Return a user by their email or id
    user(id: ID, email: String): User

    # Return messages sent by a user via userId
    # Return messages sent to a group via groupId
    messages(groupId: String, userId: String): [Message]

    # Return a group by its id
    group(groupId: ID!): Group

    # Return a todo by its id
    todo(id: ID!): todo
  }

  type Mutation {
    #send a message to a group
    createMessage(text: String!, groupId: String!): Message
    createGroup(name: String!, userIds: [String]): Group
    deleteGroup(id: String!): Group
    leaveGroup(id: String!): Group # let user leave group
    updateGroup(id: String!, name: String): Group
    #mark a todo complete or incomplete
    markTodo(id: String!): todo
    login(email: String!, password: String!): User
    signup(email: String!, password: String!, username: String): User
  }

  type Subscription {
    # Subscription fires on every message added
    # for any of the groups with one of these groupIds
    messageAdded(userId: String, groupIds: [String]): Message
    groupAdded(userId: String): Group
  }

  schema {
    query: Query
    mutation: Mutation
    subscription: Subscription
  }
`];

export const executableSchema = makeExecutableSchema({
  typeDefs: schema,
  resolvers: Resolvers,
});

export const mockExeSchema = makeExecutableSchema({
  typeDefs: schema,
  resolvers: MockResolvers,
});

// addMockFunctionsToSchema({
//   schema: executableSchema,
//   mocks: Mocks,
//   preserveResolvers: true,
// });

export default executableSchema;
