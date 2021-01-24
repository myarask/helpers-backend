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
  },
};

export default resolvers;
