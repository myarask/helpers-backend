import Joi from "joi";

const registerUser = {
  body: Joi.object().keys({
    email: Joi.string().required(),
    password: Joi.string().required(),
  }),
};


export default { registerUser };