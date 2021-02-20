import authValidation from "../validations/auth.validation";
import validate from "../middlewares/validate";
import authController from "../controllers/auth.controller";

module.exports = (router) => {
  router.post("/login", validate(authValidation.login), authController.login);
  router.post(
    "/logout",
    validate(authValidation.logout),
    authController.logout
  );
  router.post(
    "/refresh-tokens",
    validate(authValidation.refreshTokens),
    authController.refreshTokens
  );
  return router;
};