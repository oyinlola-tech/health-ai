import { authService } from "../services/authService.js";
import { userRepository } from "../repositories/userRepository.js";
import { sendSuccess } from "../utils/response.js";

export const meController = {
  me(req, res) {
    return sendSuccess(res, { user: authService.publicUser(req.user) });
  },

  async update(req, res) {
    const user = await userRepository.updateProfile(req.user.id, req.body);
    return sendSuccess(res, { user: authService.publicUser(user) });
  }
};
