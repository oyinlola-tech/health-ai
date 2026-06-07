import { z } from "zod";
import { analyticsService } from "./analytics.service.js";
import { sendSuccess } from "../../utils/response.js";
import { errors } from "../../utils/errors.js";

const analyticsQuerySchema = z
  .object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
  })
  .strict();

export const adminAnalyticsController = {
  async dashboard(req, res) {
    const parsed = analyticsQuerySchema.safeParse(req.query);
    if (!parsed.success) throw errors.badRequest("Invalid analytics filters.", parsed.error.flatten());
    const query = parsed.data;
    return sendSuccess(res, { analytics: await analyticsService.dashboard(query) });
  }
};
