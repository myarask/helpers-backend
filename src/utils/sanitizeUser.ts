
/**
 * Sanitize user
 * @param user user object
 */
const sanitizeUser = (user = {}) => {
  return {
    ...user,
    password: undefined,
  }
}

export default sanitizeUser;
