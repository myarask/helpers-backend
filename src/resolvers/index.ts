const resolvers = {
  Query: {
    services: (_: any, __: any, { models }: { models: any }) => {
      return models.Service.findAll();
    },
  },
};

export default resolvers;
