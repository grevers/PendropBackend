import express from 'express';
import {
  graphqlExpress,
  graphiqlExpress,
} from 'graphql-server-express';

import {
  makeExecutableSchema,
  addMockFunctionsToSchema,
} from 'graphql-tools';

import bodyParser from 'body-parser';
import { createServer } from 'http';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { execute, subscribe } from 'graphql';

import jwt from 'express-jwt';
import { JWT_SECRET } from './config';
import { User } from './connectors';

import { executableSchema, mockExeSchema } from './data/schema';

const GRAPHQL_PORT = 8000;
const GRAPHQL_PATH = '/graphql';
const TESTQL_PATH = '/testql';
const SUBSCRIPTIONS_PATH = '/subscriptions';

const app = express();

app.use(bodyParser.json());

app.use('/testql', jwt({
  secret: JWT_SECRET,
  credentialsRequired: false,
}), graphqlExpress(req => ({
  schema: mockExeSchema,
  context: {
      user: req.user ?
        User.findOne({ where: { id: req.user.id, version: req.user.version } }) : Promise.resolve(null),
    },
})));

app.use('/testiql', graphiqlExpress({
  endpointURL: TESTQL_PATH,
  subscriptionsEndpoint: `ws://localhost:${TESTQL_PATH}${SUBSCRIPTIONS_PATH}`,
}));

app.use('/graphql', jwt({
  secret: JWT_SECRET,
  credentialsRequired: false,
}), graphqlExpress(req => ({
  schema: executableSchema,
  context: {user: req.user ?
    User.findOne({ where: { id: req.user.id, version: req.user.version } }) : Promise.resolve(null),
  },
})));

app.use('/graphiql', graphiqlExpress({
  endpointURL: GRAPHQL_PATH
}));

const graphQLServer = createServer(app);

graphQLServer.listen(GRAPHQL_PORT, () => {
  console.log(`GraphQL Server is now running on http://localhost:${GRAPHQL_PORT}${GRAPHQL_PATH}`);
  console.log(`GraphQL Subscriptions are now running on ws://localhost:${GRAPHQL_PORT}${SUBSCRIPTIONS_PATH}`);
});

// eslint-disable-next-line no-unused-vars
const subscriptionServer = SubscriptionServer.create({
  schema: executableSchema,
  execute,
  subscribe,
}, {
  server: graphQLServer,
  path: SUBSCRIPTIONS_PATH,
});

const testSubscriptionServer = SubscriptionServer.create({
  schema: mockExeSchema,
  execute,
  subscribe,
}, {
  server: graphQLServer,
  path: SUBSCRIPTIONS_PATH,
});
