import { registerUser } from "../controllers/user.controller";
import userValidation from "../validations/user.validation";
import validate from "../middlewares/validate";

export default (router) => {
  router.post("/register", validate(userValidation.registerUser), registerUser);
  return router
}

