import express from "express";
// import bodyParser from "body-parser";
import * as dotenv from "dotenv";
import path from "path";
// import "dotenv/config";
import { ApolloServer, gql } from "apollo-server-express";
const makeModels = require("helpers-database/models/_make");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const models = makeModels({
  username: "postgres",
  password: process.env.DB_PASSWORD,
  database: "postgres",
  host: process.env.DB_HOST,
  dialect: "postgres",
  define: {
    timestamps: true,
    paranoid: true,
  },
});

const books = [
  {
    title: "The Awakening",
    author: "Kate Chopin",
  },
  {
    title: "City of Glass",
    author: "Paul Auster",
  },
];

const typeDefs = gql`
  type Book {
    title: String
    author: String
  }

  type Service {
    id: Int!
    name: String
    fee: Int
  }

  type Query {
    books: [Book]
    services: [Service]
  }
`;

const resolvers = {
  Query: {
    books: () => books,
    services: (_: any, __: any, { models }: { models: any }) => {
      return models.Service.findAll();
    },
  },
};

const context = () => ({
  models,
});

// bodyParser is needed just for POST.
const server = new ApolloServer({ typeDefs, resolvers, context });

const app = express();
server.applyMiddleware({ app, path: "/api/graphql" });

app.listen({ port: 4000 }, () =>
  console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`)
);
