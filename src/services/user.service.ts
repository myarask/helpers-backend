import httpStatus from "http-status";
import { formatISO } from "date-fns";
import { hashPassword } from "../utils/userPassword";
import prismaClient from '../prismaClient'
import { ApiError } from "../utils/catchAsync";

/**
 * Create a user
 * @param {Object} userBody
 * @returns {Promise<User>}
 */
const createUser = async (userBody) => {
  const ifExist = await prismaClient.users.findUnique({ where: { email: userBody.email } });
  if (ifExist) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'This email is already in use. Please login');
  }

  const slatedPassword = await hashPassword(userBody.password)
  const user = await prismaClient.users.create({
    data: {
      email: userBody.email,
      createdAt: formatISO(new Date()),
      updatedAt: formatISO(new Date()),
      password: slatedPassword
    }
  })

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
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  return user;
};

/**
 * Get user by id
 * @param {number} email
 * @returns {Promise<User>}
 */
const getUserById = async (id : number) => {
  const user = await prismaClient.users.findUnique({ where: { id } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  return user;
};


const userService = {
  createUser,
  getUserById,
  getUserByEmail,
};

export default userService;