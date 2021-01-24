import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const resolvers = {
  Query: {
    services: () => prisma.services.findMany(),
    visit: (_, args: { id: number }) => {
      // SECURITY: Visits should only be readable by participants
      return prisma.visits.findFirst({ where: { id: args.id } });
    },
  },
};

export default resolvers;
