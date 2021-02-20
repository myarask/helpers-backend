import bcrypt from 'bcryptjs';

/**
 * Hash password
 * @param password user password string
 */
const hashPassword = async (password: string) => {
  const newHashedPassword = await bcrypt.hash(password, 8);
  return newHashedPassword
}

/**
 * compare hash password
 * @param password password from DB
 * @param userProvidedPassword user's provided password
 */
const compareHashPassword = async (password, dbPass) => {
  return bcrypt.compare(password, dbPass);
}

export {
  hashPassword,
  compareHashPassword
}