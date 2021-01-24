import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Root = any;

type Args = {
  id: number;
};

const resolvers = {
  Query: {
    services: () => {
      return prisma.services.findMany();
    },
    visit: (_: Root, args: Args) => {
      // SECURITY: Visits should only be readable by participants
      return prisma.visits.findFirst({ where: { id: args.id } });
    },
  },
};

export default resolvers;
