import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import cors from "cors";
import passport from "passport";
import bodyParser from "body-parser";
import xss from "xss-clean";
import httpStatus from "http-status";
import express from "express";
import helmet from "helmet";
import { ApolloServer } from "apollo-server-express";
import typeDefs from "./typeDefs";
import resolvers from "./resolvers/index";
import routes from './routes';
import jwtStrategy from "./passport/config";
import { errorConverter, errorHandler } from "./middlewares/error";
import { ApiError } from "./utils/catchAsync";
import auth from "./middlewares/auth";
import CONFIG from './config/config'


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
app.use(helmet({ contentSecurityPolicy: (CONFIG.env === 'production') ? undefined : false }));
app.use(bodyParser.json());

app.use(passport.initialize());
passport.use('jwt', jwtStrategy);

const router = routes(express.Router());
app.use('/api', router)

app.get("/", (req, res) => {
  res.json({ Message: `Server is running` });
});
// TODO: Check security concerns
app.use('/api/graphql', auth());
server.applyMiddleware({ app, path: "/api/graphql" });

app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'No route found'));
});
app.use(errorConverter);
app.use(errorHandler);


app.listen({ port: CONFIG.port }, () =>
  console.log(`🚀 Server ready at http://localhost:${CONFIG.port}${server.graphqlPath}`)
);
