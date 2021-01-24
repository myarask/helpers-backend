import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import express from "express";
import { ApolloServer } from "apollo-server-express";
import typeDefs from "./typeDefs";
import resolvers from "./resolvers/index";
import models from "./models";

const context = () => ({
  models,
});

const server = new ApolloServer({ typeDefs, resolvers, context });

const app = express();
server.applyMiddleware({ app, path: "/api/graphql" });

app.listen({ port: 4000 }, () =>
  console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`)
);
