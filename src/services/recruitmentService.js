import { withTransaction } from "../config/database.js";
import { recruitmentRepository } from "../repositories/recruitmentRepository.js";
import { authService } from "./authService.js";
import { errors } from "../utils/errors.js";

export const recruitmentService = {
  createJob(user, input) {
    return recruitmentRepository.createJob({ createdBy: user.id, ...input });
  },

  publishJob(id) {
    return recruitmentRepository.publishJob({ id });
  },

  listJobs({ includeDrafts = false } = {}) {
    return recruitmentRepository.listJobs({ includeDrafts });
  },

  async apply(input, file) {
    const application = await recruitmentRepository.createApplication({
      ...input,
      cvPath: file?.path || null
    });
    if (file) {
      await recruitmentRepository.addCredential({
        applicationId: application.id,
        filePath: file.path,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size
      });
    }
    return application;
  },

  listApplications() {
    return recruitmentRepository.listApplications();
  },

  async reviewApplication({ id, status, actor }) {
    const application = await recruitmentRepository.findApplication(id);
    if (!application) throw errors.notFound("Application not found.");
    if (status === "REJECTED") {
      return recruitmentRepository.reviewApplication({ id, status, reviewedBy: actor.id });
    }

    return withTransaction(async () => {
      const doctor = await authService.createDoctor(
        {
          email: application.email,
          firstName: application.first_name,
          lastName: application.last_name,
          specialty: application.specialization,
          licenseNumber: application.medical_license_number,
          yearsExperience: application.years_experience,
          verificationStatus: "VERIFIED"
        },
        actor
      );
      await recruitmentRepository.reviewApplication({
        id,
        status: "APPROVED",
        reviewedBy: actor.id,
        createdDoctorId: doctor.user.id
      });
      return { applicationId: id, createdDoctor: doctor.user };
    });
  }
};
