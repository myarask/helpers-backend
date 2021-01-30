import { PrismaClient } from "@prisma/client";
import { ApolloError } from "apollo-server-express";
import { formatISO } from "date-fns";
import Stripe from "stripe";

const stripe = new Stripe(<string>process.env.STRIPE_KEY, {
  apiVersion: "2020-08-27",
});

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
    draftVisit: async (_, { input }, context) => {
      const user = await prisma.users.findFirst({
        where: { auth0Id: context.user.sub },
      });

      const client = await prisma.clients.findUnique({
        where: { id: input.clientId },
      });

      if (!user || !client) {
        return null;
      }

      const visitServices = await prisma.services.findMany({
        where: { id: { in: input.serviceIds } },
      });

      const visit = await prisma.visits.create({
        data: {
          userId: user.id,
          city: client.city,
          country: client.country,
          line1: client.line1,
          line2: client.line2,
          postalCode: client.postalCode,
          state: client.state,
          notes: input.notes,
          clientId: input.clientId,
          baseFee: 1000,
        },
        select: {
          id: true,
        },
      });

      if (!visit) {
        return;
      }

      await Promise.all(
        visitServices.map((service) =>
          prisma.visitServices.create({
            data: {
              visitId: visit.id,
              serviceId: service.id,
              name: service.name,
              fee: service.fee,
            },
          })
        )
      );

      return visit;
    },
    releaseVisit: async (_, { id }, context) => {
      const user = await prisma.users.findFirst({
        where: { auth0Id: context.user.sub },
      });

      if (!user) {
        throw new ApolloError(`This user does not exist`, "MISSING_DATA");
      }

      if (!user.customerId) {
        throw new ApolloError(
          `This user does not have a customerId`,
          "MISSING_DATA"
        );
      }

      const visit = await prisma.visits.findFirst({
        where: { id },
      });

      if (!visit) {
        throw new ApolloError(`This visit does not exist`, "MISSING_DATA");
      }

      if (visit.userId !== user.id) {
        throw new ApolloError(
          `You do not have permission to release visit ${id}`,
          "PERMISSIONS"
        );
      }

      if (visit.releasedAt) {
        throw new ApolloError(
          `Visit ${id} has already been released`,
          "NOT_ALLOWED"
        );
      }

      const visitServices = await prisma.visitServices.findMany({
        where: { visitId: visit.id },
      });

      let amount = visit.baseFee || 0;
      visitServices.forEach((service) => {
        amount += service.fee || 0;
      });

      amount = Math.round(amount * 1.13); // Ontario taxes

      // TODO: save and use PaymentMethodId in DB so that
      // it doesn't need to be retrieved from stripe
      const customer = await stripe.customers.retrieve(user.customerId);

      if (!customer) {
        throw new ApolloError(
          `Could not retrieve customer from stripe`,
          "STRIPE"
        );
      }

      if (customer.deleted) {
        throw new ApolloError(`Customer has beed deleted`, "STRIPE");
      }

      // if (!customer.default_source) {
      //   throw new ApolloError(
      //     `Customer does not have a default payment method`,
      //     "STRIPE"
      //   );
      // }

      console.log(customer);

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "cad",
        customer: user.customerId,
        confirm: true,
        // payment_method: customer.default_source.toString(),
        payment_method: <string>(
          customer.invoice_settings.default_payment_method
        ),
      });

      if (!paymentIntent) {
        throw new ApolloError(`Failed to create payment intent`, "STRIPE");
      }

      return prisma.visits.update({
        where: { id },
        data: {
          releasedAt: formatISO(new Date()),
          paymentIntentId: paymentIntent.id,
        },
      });
      // return models.Visit.update(
      //   {
      //     releasedAt: models.sequelize.literal("CURRENT_TIMESTAMP"),
      //     paymentIntentId: paymentIntent.id,
      //   },
      //   { where: { id } }
      // );
    },
    updateMyUser: async (_, { fullName, phoneNumber }, context: Context) => {
      // Can't use .update because auth0Id is not unique (yet)
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
