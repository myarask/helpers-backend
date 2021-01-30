import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

const stripe = new Stripe(<string>process.env.STRIPE_KEY, {
  apiVersion: "2020-08-27",
});

// const stripe = require('stripe')(process.env.STRIPE_KEY);

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
  Mutation: {
    updateMyUser: async (_, { fullName, phoneNumber }, context: Context) => {
      // Can't use .update because auth0Id is not unique
      await prisma.users.updateMany({
        where: { auth0Id: context.user.sub },
        data: { fullName, phoneNumber },
      });

      return prisma.users.findFirst({
        where: { auth0Id: context.user.sub },
      });
    },
    saveMyCard: async (_, { paymentMethodId }, context) => {
      const user = await prisma.users.findFirst({
        where: { auth0Id: context.user.sub },
      });

      if (!user) {
        // Should throw error instead?
        return null;
      }

      // Add payment method to existing customer, if there is one.
      if (user.customerId) {
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: user.customerId,
        });

        await stripe.customers.update(user.customerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });

        return user.customerId;
      }

      // Create a new customer with a payment method if there is no customer ID.
      const newCustomer = await stripe.customers.create({
        payment_method: paymentMethodId,
        email: user.email,
        name: user.fullName ?? undefined,
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      await prisma.users.update({
        where: { id: user.id },
        data: { customerId: newCustomer.id },
      });

      return newCustomer.id;
    },
  },
  Query: {
    activeVisits: async (_, __, context: Context) => {
      prisma.visits.findMany({
        where: {
          cancelledAt: null,
          finishedAt: null,
          releasedAt: {
            not: null,
          },
          Users: {
            auth0Id: context.user.sub, // Only readable by visit creator
          },
        },
      });
    },
    agencies: () => prisma.agencies.findMany(),
    agency: (_, { id }) => prisma.agencies.findFirst({ where: { id } }),
    clients: () => prisma.clients.findMany(),
    roles: () => prisma.roles.findMany(),
    // TODO: replace internalRoles and agencyRoles with roles
    internalRoles: () =>
      prisma.roles.findMany({ where: { isInternalRole: true } }),
    agencyRoles: () => prisma.roles.findMany({ where: { isAgencyRole: true } }),
    internalUsers: () => prisma.internalUsers.findMany(),
    services: () => prisma.services.findMany(),
    visit: (_, { id }, context: Context) =>
      prisma.visits.findFirst({
        where: {
          id,
          Users: {
            auth0Id: context.user.sub, // Only readable by visit creator
          },
        },
      }),
    myUser: (_, __, context: Context) =>
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
