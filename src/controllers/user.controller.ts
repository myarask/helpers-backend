import { catchAsync } from "../utils/catchAsync";
import { userService, tokenService } from "../services";

const registerUser = catchAsync(async (req, res) => {
  const { password, email } = req.body;

  const user = await userService.createUser({ password, email });
  const tokens = await tokenService.generateAuthTokens(user);
  res.send({ user, tokens });
});

export { registerUser };