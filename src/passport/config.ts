import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt'
import prisma from '../prismaClient'

enum TOKEN_TYPES {
  ACCESS = 'access',
  REFRESH = 'refresh',
}

const jwtOptions = {
  secretOrKey: process.env.JWT_SECRET,
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
};

const jwtVerify = async (payload, done) => {
  try {
    if (payload.type !== TOKEN_TYPES.ACCESS) {
      throw new Error('Invalid token type');
    }
    const user = await prisma.users.findUnique({ where: { id: payload.sub }});

    if (!user) {
      return done(null, false);
    }
    done(null, user);
  } catch (error) {
    done(error, false);
  }
};

const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);

export {  TOKEN_TYPES }
export default jwtStrategy;