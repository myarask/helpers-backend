import authValidation from "../validations/auth.validation";
import validate from "../middlewares/validate";
import authController from "../controllers/auth.controller";

export default (router) => {
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

  router.post(
    "/forgot-password",
    validate(authValidation.forgotPassword),
    authController.forgotPassword
  );
  router.post(
    "/reset-password",
    validate(authValidation.resetPassword),
    authController.resetPassword
  );

  router.get(
    "/reset-password",
    validate(authValidation.resetPasswordPage),
    authController.resetPasswordPage
  );

  return router;
};
