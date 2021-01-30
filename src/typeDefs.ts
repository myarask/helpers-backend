import { gql } from "apollo-server-express";

const typeDefs = gql`
  type Agency {
    id: Int!
    name: String
    users: [AgencyUser]!
  }

  type AgencyUser {
    id: Int
    user: User
    roles: [AgencyUserRole]
    services: [AgencyUserService]
  }

  type AgencyUserRole {
    id: Int!
    roleId: Int!
  }

  type AgencyUserService {
    id: Int!
    serviceId: Int!
    agencyUserId: Int!
  }

  type Client {
    id: Int!
    userId: Int!
    user: User
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

  input ClientInput {
    fullName: String!
    city: String!
    country: String!
    line1: String!
    line2: String
    postalCode: String!
    state: String!
    phoneNumber: String
  }

  type InternalUser {
    id: Int!
    user: User
    roles: [InternalUserRole]
  }

  type InternalUserRole {
    id: Int!
    roleId: Int!
  }

  type Role {
    id: Int!
    name: String!
  }

  type Service {
    id: Int!
    name: String
    fee: Int
  }

  type User {
    id: Int!
    email: String
    fullName: String
    customerId: String
    clients: [Client]
    phoneNumber: String
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

  input VisitInput {
    clientId: Int!
    notes: String
    serviceIds: [Int!]!
  }

  type VisitServices {
    id: Int
    visitId: Int
    serviceId: Int
    name: String
    fee: Int
  }

  type Query {
    activeVisits: [Visit]
    agencies: [Agency]
    agency(id: Int!): Agency
    clients: [Client]
    internalRoles: [Role]
    agencyRoles: [Role]
    roles: [Role]
    services: [Service]
    visit(id: Int!): Visit
    internalUsers: [User]
    myUser: User
  }

  type Mutation {
    createMyUser(fullName: String!, phoneNumber: String): User
    updateMyUser(fullName: String!, phoneNumber: String): User
    createMyClient(values: ClientInput): Client
    draftVisit(input: VisitInput): Visit
    releaseVisit(id: Int!): Visit
    saveMyCard(paymentMethodId: String!): String
  }
`;

export default typeDefs;
