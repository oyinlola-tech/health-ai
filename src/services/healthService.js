import { healthRepository } from "../repositories/healthRepository.js";

export const healthService = {
  create(user, input) {
    return healthRepository.createEntry({
      patientId: user.id,
      category: input.category,
      title: input.title,
      value: input.value,
      recordedAt: input.recordedAt,
      metadata: input.metadata
    });
  },

  list(user) {
    return healthRepository.listForPatient(user.id);
  }
};
