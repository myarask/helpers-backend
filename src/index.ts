import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import jwt from "express-jwt";
import jwksRsa from "jwks-rsa";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import typeDefs from "./typeDefs";
import resolvers from "./resolvers/index";
import cors from "cors";

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }: any) => {
    return req; // Includes user identification from auth0
  },
});

const app = express();

app.use(cors());

// Forces calls to have a valid token in the Authorization header
app.use(
  jwt({
    secret: jwksRsa.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: `https://${process.env.TENANT}.auth0.com/.well-known/jwks.json`,
    }),

    // audience: 'not-specified', (ex: helpers-consumer-test)
    issuer: `https://${process.env.TENANT}.auth0.com/`,
    algorithms: ["RS256"],
  })
);
server.applyMiddleware({ app, path: "/api/graphql" });

const PORT = process.env.PORT || 4000;

app.listen({ port: PORT }, () =>
  console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`)
);
