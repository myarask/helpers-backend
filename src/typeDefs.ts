import { gql } from "apollo-server-express";

const typeDefs = gql`
  type AgencyUser {
    id: Int
    user: User
  }

  type Client {
    id: Int!
    userId: Int!
    approvedAt: String
    fullName: String!
    city: String!
    country: String!
    line1: String!
    line2: String
    postalCode: String!
    state: String!
    phoneNumber: String
  }

  type User {
    id: Int!
    email: String
    fullName: String
    customerId: String
    clients: [Client]
    phoneNumber: String
  }

  type Service {
    id: Int!
    name: String
    fee: Int
  }

  type Visit {
    id: Int
    clientId: Int
    userId: Int
    agencyUserId: Int
    notes: String
    city: String
    country: String
    line1: String
    line2: String
    postalCode: String
    state: String
    createdAt: String
    releasedAt: String
    matchedAt: String
    startedAt: String
    finishedAt: String
    cancelledAt: String
    baseFee: Int
    client: Client
    services: [VisitServices]
    agencyUser: AgencyUser
  }

  type VisitServices {
    id: Int
    visitId: Int
    serviceId: Int
    name: String
    fee: Int
  }

  type Query {
    services: [Service]
    visit(id: Int!): Visit
  }
`;

export default typeDefs;
