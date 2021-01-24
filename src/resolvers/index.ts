import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const resolvers = {
  Query: {
    services: () => {
      return prisma.services.findMany();
    },
    visit: (_: any, { id }: { id: number }) => {
      // SECURITY: Visits should only be readable by participants
      return prisma.visits.findFirst({ where: { id } });
    },
  },
};

export default resolvers;
