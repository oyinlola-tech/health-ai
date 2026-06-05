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

  async apply(input, files = {}) {
    const cv = files.cv?.[0] || null;
    const license = files.license?.[0] || null;
    if (!cv || !license) throw errors.badRequest("CV and medical license uploads are required.");
    const application = await recruitmentRepository.createApplication({
      ...input,
      cvPath: cv.path,
      licenseDocumentPath: license.path
    });
    for (const file of [cv, license]) {
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

  async status(input) {
    const application = await recruitmentRepository.findApplicationStatus(input);
    if (!application) throw errors.notFound("Application not found.");
    return application;
  },

  async reviewApplication({ id, status, actor }) {
    const application = await recruitmentRepository.findApplication(id);
    if (!application) throw errors.notFound("Application not found.");
    if (status === "REJECTED") {
      const reviewed = await recruitmentRepository.reviewApplication({ id, status, reviewedBy: actor.id });
      await recruitmentRepository.addReview({ applicationId: id, reviewedBy: actor.id, status, notes: "Application rejected by admin." });
      return reviewed;
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
      await recruitmentRepository.addReview({ applicationId: id, reviewedBy: actor.id, status: "APPROVED", notes: "Doctor account created and moved into verification pipeline." });
      return { applicationId: id, createdDoctor: doctor.user };
    });
  }
};
