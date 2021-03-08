import { ApolloError } from "apollo-server-express";
import prisma from "../prismaClient";
import CONFIG from "../config/config";
import { formatISO } from "date-fns";
import Stripe from "stripe";

const stripe = new Stripe(<string>CONFIG.stripeKey, {
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
  myUser: {
    id: number;
  };
};

const resolvers = {
  Mutation: {
    draftVisit: async (_, { input }, context) => {
      const user = await prisma.users.findFirst({
        where: { id: context.myUser.id },
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
        where: { id: context.myUser.id },
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

      if (customer.deleted) {
        throw new ApolloError(`Customer has beed deleted`, "STRIPE");
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "cad",
        customer: user.customerId,
        confirm: true,
        payment_method: <string>(
          customer.invoice_settings.default_payment_method
        ),
      });

      return prisma.visits.update({
        where: { id },
        data: {
          releasedAt: formatISO(new Date()),
          paymentIntentId: paymentIntent.id,
        },
      });
    },
    updateMyUser: async (_, { fullName, phoneNumber }, context: Context) => {
      return prisma.users.update({
        where: {
          id: context.myUser.id,
        },
        data: { fullName, phoneNumber },
      });
    },
    saveMyCard: async (_, { paymentMethodId }, context) => {
      const user = await prisma.users.findFirst({
        where: { id: context.myUser.id },
      });

      if (!user) {
        throw new ApolloError(`This user does not exist`, "MISSING_DATA");
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
    matchVisit: async (_, { id }, context: Context) => {
      // Used by a PSW to accept a visit

      // TODO:
      // - Ensure the right agencyId is used
      // - Check for authorized skill set

      const agencyUser = await prisma.agencyUsers.findFirst({
        where: { userId: context.myUser.id },
      });

      if (!agencyUser) {
        throw new ApolloError("User must have an agencyUserId", "PERMISSIONS");
      }

      const visit = await prisma.visits.findUnique({
        where: { id },
      });

      if (!visit) throw new ApolloError("Visit cannot be found", "NO_DATA");
      if (visit.matchedAt)
        throw new ApolloError("Visit is already matched", "RESTRICTED");
      if (visit.cancelledAt)
        throw new ApolloError("Visit is cancelled", "RESTRICTED");
      if (visit.agencyUserId)
        throw new ApolloError("Visit is already taken", "RESTRICTED");

      return prisma.visits.update({
        data: {
          matchedAt: formatISO(new Date()),
          agencyUserId: agencyUser.id,
        },
        where: {
          id,
        },
      });
    },
    startVisit: async (_, { id }, context: Context) => {
      // Used by a PSW to confirm that they have arrived at the visit location

      const agencyUser = await prisma.agencyUsers.findFirst({
        where: { userId: context.myUser.id },
      });

      if (!agencyUser)
        throw new ApolloError("An agencyUserId is required", "RESTRICTED");

      const visit = await prisma.visits.findUnique({
        where: { id },
      });

      if (!visit) throw new ApolloError("Visit cannot be found", "NO_DATA");
      if (visit.startedAt)
        throw new ApolloError("Visit is already started", "RESTRICTED");
      if (visit.cancelledAt)
        throw new ApolloError("Visit is cancelled", "RESTRICTED");
      if (visit.agencyUserId !== agencyUser.id)
        throw new ApolloError("Visit is taken by another PSW", "RESTRICTED");

      return prisma.visits.update({
        data: {
          startedAt: formatISO(new Date()),
        },
        where: {
          id,
        },
      });
    },
    finishVisit: async (_, { id }, context: Context) => {
      // Used by a PSW to finish the visit.

      const agencyUser = await prisma.agencyUsers.findFirst({
        where: { userId: context.myUser.id },
      });

      if (!agencyUser)
        throw new ApolloError("An agencyUserId is required", "RESTRICTED");

      const visit = await prisma.visits.findUnique({
        where: { id },
      });

      if (!visit) throw new ApolloError("Visit cannot be found", "NO_DATA");
      if (visit.finishedAt)
        throw new ApolloError("Visit is already finished", "RESTRICTED");
      if (visit.cancelledAt)
        throw new ApolloError("Visit is cancelled", "RESTRICTED");
      if (visit.agencyUserId !== agencyUser.id)
        throw new ApolloError("Visit is taken by another PSW", "RESTRICTED");

      return prisma.visits.update({
        data: {
          finishedAt: formatISO(new Date()),
        },
        where: {
          id,
        },
      });
    },
  },
  Query: {
    myVisit: async (_, __, context: Context) => {
      // The visit that a PSW is currently assigned to
      const userId = context.myUser.id;

      return prisma.visits.findFirst({
        where: {
          finishedAt: null,
          cancelledAt: null,
          deletedAt: null,
          AgencyUsers: {
            userId,
          },
        },
      });
    },
    myOpenVisits: async (_, __, context: Context) => {
      // Visits that a PSW is allowed to take
      const userServices = await prisma.agencyUserServices.findMany({
        where: {
          AgencyUsers: {
            Users: {
              id: context.myUser.id,
            },
          },
        },
      });

      const allowedIds = userServices.map((service) => service.serviceId);

      const visits = await prisma.visits.findMany({
        where: {
          agencyUserId: null,
          matchedAt: null,
          cancelledAt: null,
          releasedAt: {
            not: null,
          },
          deletedAt: null,
        },
        include: {
          VisitServices: true,
        },
      });

      return visits.filter((visit) =>
        visit.VisitServices.every((service) =>
          allowedIds.includes(service.serviceId)
        )
      );
    },
    activeVisits: (_, __, context: Context) => {
      // The active visits of a consumer
      return prisma.visits.findMany({
        where: {
          cancelledAt: null,
          finishedAt: null,
          releasedAt: {
            not: null,
          },
          deletedAt: null,
          Users: {
            id: context.myUser.id, // Only readable by visit creator
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
    services: () =>
      prisma.services.findMany({
        where: {
          deletedAt: null,
        },
      }),
    visit: async (_, { id }, context: Context) => {
      const visit = await prisma.visits.findFirst({
        where: {
          id,
        },
        include: {
          Users: true,
          AgencyUsers: true,
        },
      });

      if (!visit) {
        throw new ApolloError(`Visit cannot be queried`, "NO_DATA");
      }

      // Can always be queried by the visit creator
      if (visit.userId === context.myUser.id) {
        return visit;
      }

      // If no match, can be queried by a PSW
      // TODO: Restrict by qualifications
      if (!visit.agencyUserId) {
        return visit;
      }

      // If there is a match, can be queried by matched PSW
      if (visit.AgencyUsers?.userId === context.myUser.id) {
        return visit;
      }

      throw new ApolloError(`Visit cannot be queried`, "NO_DATA");
    },
    myUser: (_, __, context: Context) =>
      prisma.users.findFirst({ where: { id: context.myUser.id } }),
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
