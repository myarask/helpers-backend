import { catchAsync } from "../utils/catchAsync";
import { userService, tokenService } from "../services";
import sanitizeUser from "../utils/sanitizeUser";

const registerUser = catchAsync(async (req, res) => {
  const { password, email } = req.body;

  const user = await userService.createUser({ password, email });
  const tokens = await tokenService.generateAuthTokens(user);
  res.send({  user: sanitizeUser(user), tokens });
});

export { registerUser };