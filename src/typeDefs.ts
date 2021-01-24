import { gql } from "apollo-server-express";

const typeDefs = gql`
  type Service {
    id: Int!
    name: String
    fee: Int
  }

  type Query {
    services: [Service]
  }
`;

export default typeDefs;
