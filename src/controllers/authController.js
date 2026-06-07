import { authService } from "../services/authService.js";
import { issueCsrfToken } from "../middlewares/csrf.js";
import { sendSuccess } from "../utils/response.js";
import { env } from "../config/env.js";
import { analyticsEvents, eventTracker } from "../modules/analytics/event.tracker.js";
import { eventBus } from "../modules/events/event.bus.js";
import { eventTypes } from "../modules/events/event.types.js";

const refreshCookieName = "mx_refresh";

function refreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: env.JWT_REFRESH_TTL_SECONDS * 1000
  };
}

function setRefreshCookie(res, token) {
  res.cookie(refreshCookieName, token, refreshCookieOptions());
}

function clearRefreshCookie(res) {
  res.clearCookie(refreshCookieName, refreshCookieOptions());
}

export const authController = {
  csrf(req, res) {
    return sendSuccess(res, { csrfToken: issueCsrfToken(req, res) });
  },

  async register(req, res) {
    const result = await authService.registerPatient(req.body, req);
    setRefreshCookie(res, result.refreshToken);
    return sendSuccess(res, {
      user: result.user,
      trial: result.trial,
      accessToken: result.accessToken
    }, {}, 201);
  },

  async login(req, res) {
    const result = await authService.login(req.body, req);
    setRefreshCookie(res, result.refreshToken);
    await eventTracker.startSession({ user: result.user, req, refreshTokenId: result.refreshTokenId });
    await eventTracker.track({
      userId: result.user.id,
      eventType: analyticsEvents.LOGIN,
      entityType: "users",
      entityId: result.user.id,
      req
    });
    eventBus.publishLater(
      eventTypes.USER_LOGIN_NEW_DEVICE,
      {
        user: result.user,
        time: new Date().toISOString(),
        device: req.get("user-agent") || "Unknown device"
      },
      { userId: result.user.id, entityType: "users", entityId: result.user.id }
    );
    return sendSuccess(res, {
      user: result.user,
      accessToken: result.accessToken
    });
  },

  async refresh(req, res) {
    const result = await authService.refresh(req.cookies?.[refreshCookieName]);
    setRefreshCookie(res, result.refreshToken);
    return sendSuccess(res, {
      user: result.user,
      accessToken: result.accessToken
    });
  },

  async logout(req, res) {
    await authService.logout(req.cookies?.[refreshCookieName]);
    clearRefreshCookie(res);
    return sendSuccess(res, { loggedOut: true });
  },

  async requestPasswordReset(req, res) {
    return sendSuccess(res, await authService.requestPasswordReset(req.body.email));
  },

  async resetPassword(req, res) {
    return sendSuccess(res, await authService.resetPassword(req.body));
  },

  async verifyEmail(req, res) {
    return sendSuccess(res, await authService.verifyEmail(req.body.token));
  }
};
