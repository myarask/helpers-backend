import Joi from "joi";

const login = {
  body: Joi.object().keys({
    email: Joi.string().required(),
    otp: Joi.string().required(),
  }),
};

const logout = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const refreshTokens = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const authValidation = {
  login,
  logout,
  refreshTokens,
};

export default authValidation;
