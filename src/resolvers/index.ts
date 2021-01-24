import { PrismaClient } from "@prisma/client";

type Context = {
  user: {
    iss: string;
    sub: string;
    aud: Array<string>;
    iat: number;
    exp: number;
    azp: string;
    scope: string;
  };
};

const prisma = new PrismaClient();

const resolvers = {
  Query: {
    services: () => prisma.services.findMany(),
    visit: (_, args: { id: number }, context: Context) =>
      prisma.visits.findFirst({
        where: {
          id: args.id,
          Users: {
            auth0Id: context.user.sub, // Only readable by visit creator
          },
        },
      }),
    myUser: (_, __, context) =>
      prisma.users.findFirst({ where: { auth0Id: context.user.sub } }),
  },
  Client: {
    user: ({ id }) => prisma.clients.findUnique({ where: { id } }).Users(),
  },
  User: {
    clients: ({ id }) => prisma.users.findUnique({ where: { id } }).Clients(),
  },
  Visit: {
    client: ({ id }) => prisma.visits.findUnique({ where: { id } }).Clients(),
    services: ({ id }) =>
      prisma.visits.findUnique({ where: { id } }).VisitServices(),
    agencyUser: ({ id }) =>
      prisma.visits.findUnique({ where: { id } }).AgencyUsers(),
  },
  Agency: {
    users: ({ id }) =>
      prisma.agencies.findUnique({ where: { id } }).AgencyUsers(),
  },
  InternalUser: {
    roles: ({ id }) =>
      prisma.internalUsers.findUnique({ where: { id } }).InternalUserRoles(),
    user: ({ id }) =>
      prisma.internalUsers.findUnique({ where: { id } }).Users(),
  },
  AgencyUser: {
    user: ({ id }) => prisma.agencyUsers.findUnique({ where: { id } }).Users(),
    roles: ({ id }) =>
      prisma.agencyUsers.findUnique({ where: { id } }).AgencyUserRoles(),
    services: ({ id }) =>
      prisma.agencyUsers.findUnique({ where: { id } }).AgencyUserServices(),
  },
};

export default resolvers;
