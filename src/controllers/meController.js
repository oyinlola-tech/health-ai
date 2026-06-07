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
  },

  settings(req, res) {
    return sendSuccess(res, { settings: authService.settingsForUser(req.user) });
  },

  async updateSettings(req, res) {
    return sendSuccess(res, await authService.updateSettings(req.user, req.body));
  },

  async changePassword(req, res) {
    return sendSuccess(res, await authService.changePassword(req.user, req.body));
  }
};
