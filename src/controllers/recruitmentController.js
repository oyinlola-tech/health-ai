import { recruitmentService } from "../services/recruitmentService.js";
import { sendSuccess } from "../utils/response.js";

export const recruitmentController = {
  async jobs(req, res) {
    return sendSuccess(res, { jobs: await recruitmentService.listJobs({ includeDrafts: req.user?.role === "Admin" }) });
  },

  async createJob(req, res) {
    return sendSuccess(res, { job: await recruitmentService.createJob(req.user, req.body) }, {}, 201);
  },

  async publishJob(req, res) {
    return sendSuccess(res, { job: await recruitmentService.publishJob(req.params.id) });
  },

  async apply(req, res) {
    return sendSuccess(res, { application: await recruitmentService.apply(req.body, req.file) }, {}, 201);
  },

  async applications(_req, res) {
    return sendSuccess(res, { applications: await recruitmentService.listApplications() });
  },

  async review(req, res) {
    return sendSuccess(res, await recruitmentService.reviewApplication({ id: req.params.id, status: req.body.status, actor: req.user }));
  }
};
