import { notificationRepository } from "../repositories/notificationRepository.js";
import { errors } from "../utils/errors.js";

export const notificationService = {
  list(user) {
    return notificationRepository.listForUser(user.id);
  },

  async markRead(user, id) {
    const notification = await notificationRepository.markRead({ id, userId: user.id });
    if (!notification) throw errors.notFound("Notification not found.");
    return notification;
  }
};
