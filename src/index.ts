import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import jwt from "express-jwt";
import cors from "cors";
import jwksRsa from "jwks-rsa";
import passport from "passport";
import xss from "xss-clean";
import httpStatus from "http-status";
import express from "express";
import helmet from "helmet";
import { ApolloServer } from "apollo-server-express";
import typeDefs from "./typeDefs";
import resolvers from "./resolvers/index";
import jwtStrategy from "./passport/config";
import { errorConverter, errorHandler } from "./middlewares/error";
import { ApiError } from "./utils/catchAsync";


const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }: any) => {
    return req; // Includes user identification from auth0
  },
});

const app = express();

app.use(cors());
app.use(xss());
app.use(helmet());

app.use(passport.initialize());
passport.use('jwt', jwtStrategy);

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


app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});
app.use(errorConverter);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

app.listen({ port: PORT }, () =>
  console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`)
);
