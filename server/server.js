import express from 'express';
import {
  graphqlExpress,
  graphiqlExpress,
} from 'graphql-server-express';

import {
  makeExecutableSchema,
  addMockFunctionsToSchema,
} from 'graphql-tools';

import { createServer } from 'http';
import bodyParser from 'body-parser';

import { schema } from './data/schema';
import { Mocks } from './data/mocks';
import { MockResolvers } from './mockResolvers';
import { Resolvers } from './resolvers';

const app = express();
const GRAPHQL_PORT = 8000;

app.use(bodyParser.json());

//const mockExeSchema = makeExecutableSchema({
//  typeDefs: schema,
//  resolvers: MockResolvers,
//});

const executableSchema = makeExecutableSchema({
  typeDefs: schema,
  resolvers: Resolvers,
});

//Comment out or remove the code below when using REAL DATA

//addMockFunctionsToSchema({
//  schema: mockExeSchema,
//  mocks: Mocks,
//  preserveResolvers: true,
//});

//app.use('/testql', graphqlExpress({
//  schema: mockExeSchema,
//  context: {},
//}));

//app.use('/testiql', graphiqlExpress({
//  endpointURL: '/testql',
//}));

app.use('/graphql', graphqlExpress({
  schema: executableSchema,
  context: {},
}));

app.use('/graphiql', graphiqlExpress({
  endpointURL: '/graphql',
}));

const graphQLServer = createServer(app);

graphQLServer.listen(GRAPHQL_PORT, () => console.log(`GraphQL Server is now running on http://localhost:${GRAPHQL_PORT}`));
