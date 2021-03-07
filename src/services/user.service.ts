import httpStatus from "http-status";
import { formatISO } from "date-fns";
import { hashPassword } from "../utils/userPassword";
import prismaClient from "../prismaClient";
import { ApiError } from "../utils/catchAsync";
import emailService from "./email.service";

/**
 * Create a user
 * @param {Object} userBody
 * @returns {Promise<User>}
 */
const createUser = async (userBody) => {
  const ifExist = await prismaClient.users.findUnique({
    where: { email: userBody.email },
  });
  if (ifExist) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "This email is already in use. Please login"
    );
  }

  if (!userBody.password) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Please provide proper password"
    );
  }

  const slatedPassword = await hashPassword(userBody.password);
  const user = await prismaClient.users.create({
    data: {
      email: userBody.email,
      createdAt: formatISO(new Date()),
      updatedAt: formatISO(new Date()),
      password: slatedPassword,
    },
  });

  const subject = "Welcome to Helpers";
  const text = "Your account has been created successfully";

  await emailService.sendEmail(userBody.email, subject, text);

  return user;
};

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<User>}
 */
const getUserByEmail = async (email: string) => {
  const user = await prismaClient.users.findUnique({ where: { email } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  return user;
};

/**
 * Get user by id
 * @param {number} email
 * @returns {Promise<User>}
 */
const getUserById = async (id: number) => {
  const user = await prismaClient.users.findUnique({ where: { id } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  return user;
};

/**
 * Update user by id
 * @param {number} id
 * @param {number} userBody
 * @returns {Promise<User>}
 */
const updateUserById = async (id: number, userBody: any) => {
  const user = await prismaClient.users.findUnique({ where: { id } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  return prismaClient.users.update({ where: { id }, data: userBody });
};

const userService = {
  createUser,
  getUserById,
  updateUserById,
  getUserByEmail,
};

export default userService;
