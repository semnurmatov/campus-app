const express = require('express');

const db = require('./util/database');

const { graphqlUploadExpress } = require('graphql-upload');
const { ApolloServer } = require('apollo-server-express');

const schema = require('./graphql/schema');
const resolvers = require('./graphql/resolver');

const eventRemoveOld = require('./middleware/eventRemoveOld');

require('dotenv').config();

const pathGraphql= '/graphql';

const app = express();

app.use(eventRemoveOld);

app.use(graphqlUploadExpress({ maxFileSize: 50000000, maxFiles: 10 }));// 6.25 mb file size

const server = new ApolloServer({
    uploads: false,
    typeDefs: schema,
    resolvers: resolvers
});

server.applyMiddleware({app, pathGraphql});

const port = process.env.PORT || 5000;

app.listen(port,() => console.log(`Server is listening to port ${port}`));