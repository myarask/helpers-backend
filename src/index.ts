import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import jwt from "express-jwt";
import jwksRsa from "jwks-rsa";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import typeDefs from "./typeDefs";
import resolvers from "./resolvers/index";

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }: any) => {
    return req; // Includes user identification from auth0
  },
});

const app = express();

// Forces calls to have a valid token in the Authorization header
app.use(
  jwt({
    secret: jwksRsa.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: `https://${process.env.TENANT}.auth0.com/.well-known/jwks.json`,
    }),

    audience: process.env.AUDIENCE,
    issuer: `https://${process.env.TENANT}.auth0.com/`,
    algorithms: ["RS256"],
  })
);
server.applyMiddleware({ app, path: "/api/graphql" });

app.listen({ port: 4000 }, () =>
  console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`)
);
