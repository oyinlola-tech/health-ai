import { env } from "../config/env.js";

const successResponse = {
  description: "Successful response",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/SuccessResponse" }
    }
  }
};

const errorResponses = {
  400: { $ref: "#/components/responses/BadRequest" },
  401: { $ref: "#/components/responses/Unauthorized" },
  403: { $ref: "#/components/responses/Forbidden" },
  404: { $ref: "#/components/responses/NotFound" },
  429: { $ref: "#/components/responses/TooManyRequests" },
  500: { $ref: "#/components/responses/InternalServerError" }
};

const bearerAuth = [{ bearerAuth: [] }];
const csrfHeader = [{ $ref: "#/components/parameters/CsrfToken" }];

function jsonRequest(schemaRef) {
  return {
    required: true,
    content: {
      "application/json": {
        schema: { $ref: schemaRef }
      }
    }
  };
}

function operation({ tags, summary, security, parameters = [], requestBody, responses = {} }) {
  return {
    tags,
    summary,
    ...(security ? { security } : {}),
    ...(parameters.length ? { parameters } : {}),
    ...(requestBody ? { requestBody } : {}),
    responses: {
      200: successResponse,
      ...responses,
      ...errorResponses
    }
  };
}

function stateChangingOperation(options) {
  return operation({
    ...options,
    parameters: [...csrfHeader, ...(options.parameters || [])]
  });
}

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "MedExplain AI API",
    version: "1.0.0",
    description:
      "Interactive API documentation for testing the MedExplain AI backend. For POST, PUT, PATCH, and DELETE requests, call GET /auth/csrf first and pass the returned token as X-CSRF-Token."
  },
  servers: [
    {
      url: `${env.PUBLIC_APP_URL.replace(/\/$/, "")}/api`,
      description: "Configured application API"
    },
    {
      url: "/api",
      description: "Same-origin API"
    }
  ],
  tags: [
    { name: "System" },
    { name: "Auth" },
    { name: "Me" },
    { name: "Reports" },
    { name: "AI" },
    { name: "Appointments" },
    { name: "Notifications" },
    { name: "Recruitment" },
    { name: "Admin" },
    { name: "Doctor" },
    { name: "Legal" },
    { name: "Health History" }
  ],
  paths: {
    "/health": {
      get: operation({ tags: ["System"], summary: "Check API health" })
    },
    "/config/public": {
      get: operation({ tags: ["System"], summary: "Get public frontend configuration" })
    },
    "/auth/csrf": {
      get: operation({
        tags: ["Auth"],
        summary: "Issue a CSRF token cookie and return the token",
        responses: { 200: successResponse }
      })
    },
    "/auth/register": {
      post: stateChangingOperation({
        tags: ["Auth"],
        summary: "Register a patient account",
        requestBody: jsonRequest("#/components/schemas/RegisterRequest"),
        responses: { 201: successResponse }
      })
    },
    "/auth/login": {
      post: stateChangingOperation({
        tags: ["Auth"],
        summary: "Log in and receive an access token",
        requestBody: jsonRequest("#/components/schemas/LoginRequest")
      })
    },
    "/auth/logout": {
      post: stateChangingOperation({
        tags: ["Auth"],
        summary: "Log out and revoke the refresh token",
        security: bearerAuth
      })
    },
    "/auth/refresh": {
      post: stateChangingOperation({
        tags: ["Auth"],
        summary: "Refresh the access token from the refresh-token cookie"
      })
    },
    "/auth/password-reset/request": {
      post: stateChangingOperation({
        tags: ["Auth"],
        summary: "Request a password reset email",
        requestBody: jsonRequest("#/components/schemas/PasswordResetRequest")
      })
    },
    "/auth/password-reset/confirm": {
      post: stateChangingOperation({
        tags: ["Auth"],
        summary: "Confirm a password reset",
        requestBody: jsonRequest("#/components/schemas/PasswordResetConfirmRequest")
      })
    },
    "/auth/email/verify": {
      post: stateChangingOperation({
        tags: ["Auth"],
        summary: "Verify an email address",
        requestBody: jsonRequest("#/components/schemas/EmailVerifyRequest")
      })
    },
    "/me": {
      get: operation({
        tags: ["Me"],
        summary: "Get the current user profile",
        security: bearerAuth
      }),
      put: stateChangingOperation({
        tags: ["Me"],
        summary: "Update the current user profile",
        security: bearerAuth,
        requestBody: jsonRequest("#/components/schemas/UpdateProfileRequest")
      })
    },
    "/reports": {
      get: operation({
        tags: ["Reports"],
        summary: "List reports for the current user",
        security: bearerAuth,
        parameters: [
          { $ref: "#/components/parameters/Page" },
          { $ref: "#/components/parameters/PageSize" },
          { $ref: "#/components/parameters/Status" }
        ]
      }),
      post: stateChangingOperation({
        tags: ["Reports"],
        summary: "Upload a medical report",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: { $ref: "#/components/schemas/ReportUploadRequest" }
            }
          }
        },
        responses: { 201: successResponse }
      })
    },
    "/reports/{id}": {
      get: operation({
        tags: ["Reports"],
        summary: "Get report details",
        security: bearerAuth,
        parameters: [{ $ref: "#/components/parameters/Id" }]
      }),
      delete: stateChangingOperation({
        tags: ["Reports"],
        summary: "Delete a report",
        security: bearerAuth,
        parameters: [{ $ref: "#/components/parameters/Id" }]
      })
    },
    "/reports/{id}/analyze": {
      post: stateChangingOperation({
        tags: ["Reports"],
        summary: "Analyze an uploaded report",
        security: bearerAuth,
        parameters: [{ $ref: "#/components/parameters/Id" }]
      })
    },
    "/ai/chat": {
      post: stateChangingOperation({
        tags: ["AI"],
        summary: "Send a message to the AI assistant",
        security: bearerAuth,
        requestBody: jsonRequest("#/components/schemas/AiChatRequest")
      })
    },
    "/ai/chat-history": {
      get: operation({
        tags: ["AI"],
        summary: "List the current user's AI chat history",
        security: bearerAuth
      })
    },
    "/ai/feedback": {
      post: stateChangingOperation({
        tags: ["AI"],
        summary: "Submit AI interaction feedback",
        security: bearerAuth,
        requestBody: jsonRequest("#/components/schemas/AiFeedbackRequest")
      })
    },
    "/appointments": {
      get: operation({
        tags: ["Appointments"],
        summary: "List appointments",
        security: bearerAuth,
        parameters: [{ $ref: "#/components/parameters/Status" }]
      }),
      post: stateChangingOperation({
        tags: ["Appointments"],
        summary: "Create an appointment request",
        security: bearerAuth,
        requestBody: jsonRequest("#/components/schemas/AppointmentCreateRequest"),
        responses: { 201: successResponse }
      })
    },
    "/appointments/{id}/status": {
      patch: stateChangingOperation({
        tags: ["Appointments"],
        summary: "Update an appointment status",
        security: bearerAuth,
        parameters: [{ $ref: "#/components/parameters/Id" }],
        requestBody: jsonRequest("#/components/schemas/AppointmentStatusRequest")
      })
    },
    "/notifications": {
      get: operation({
        tags: ["Notifications"],
        summary: "List notifications",
        security: bearerAuth
      })
    },
    "/notifications/{id}/read": {
      patch: stateChangingOperation({
        tags: ["Notifications"],
        summary: "Mark a notification as read",
        security: bearerAuth,
        parameters: [{ $ref: "#/components/parameters/Id" }]
      })
    },
    "/recruitment/jobs": {
      get: operation({ tags: ["Recruitment"], summary: "List published job openings" }),
      post: stateChangingOperation({
        tags: ["Recruitment"],
        summary: "Create a job opening",
        security: bearerAuth,
        requestBody: jsonRequest("#/components/schemas/JobCreateRequest"),
        responses: { 201: successResponse }
      })
    },
    "/recruitment/jobs/{id}/publish": {
      patch: stateChangingOperation({
        tags: ["Recruitment"],
        summary: "Publish a job opening",
        security: bearerAuth,
        parameters: [{ $ref: "#/components/parameters/Id" }]
      })
    },
    "/recruitment/applications": {
      get: operation({
        tags: ["Recruitment"],
        summary: "List job applications",
        security: bearerAuth
      }),
      post: stateChangingOperation({
        tags: ["Recruitment"],
        summary: "Submit a job application",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: { $ref: "#/components/schemas/ApplicationCreateRequest" }
            }
          }
        },
        responses: { 201: successResponse }
      })
    },
    "/recruitment/applications/{id}/review": {
      patch: stateChangingOperation({
        tags: ["Recruitment"],
        summary: "Review a job application",
        security: bearerAuth,
        parameters: [{ $ref: "#/components/parameters/Id" }],
        requestBody: jsonRequest("#/components/schemas/ApplicationReviewRequest")
      })
    },
    "/admin/users": {
      get: operation({
        tags: ["Admin"],
        summary: "List users",
        security: bearerAuth,
        parameters: [
          { $ref: "#/components/parameters/Page" },
          { $ref: "#/components/parameters/PageSize" },
          {
            name: "role",
            in: "query",
            schema: { type: "string", enum: ["Patient", "Doctor", "Admin"] }
          },
          { $ref: "#/components/parameters/Status" }
        ]
      })
    },
    "/admin/doctors": {
      post: stateChangingOperation({
        tags: ["Admin"],
        summary: "Create a doctor account",
        security: bearerAuth,
        requestBody: jsonRequest("#/components/schemas/CreateDoctorRequest"),
        responses: { 201: successResponse }
      })
    },
    "/admin/analytics": {
      get: operation({
        tags: ["Admin"],
        summary: "Get admin analytics",
        security: bearerAuth
      })
    },
    "/admin/audit-logs": {
      get: operation({
        tags: ["Admin"],
        summary: "List audit logs",
        security: bearerAuth,
        parameters: [{ $ref: "#/components/parameters/Page" }, { $ref: "#/components/parameters/PageSize" }]
      })
    },
    "/doctor/appointments": {
      get: operation({
        tags: ["Doctor"],
        summary: "List appointments assigned to the current doctor",
        security: bearerAuth
      })
    },
    "/doctor/reports": {
      get: operation({
        tags: ["Doctor"],
        summary: "List reports visible to the current doctor",
        security: bearerAuth
      })
    },
    "/legal/policies": {
      get: operation({ tags: ["Legal"], summary: "List legal policies" })
    },
    "/legal/consents": {
      post: stateChangingOperation({
        tags: ["Legal"],
        summary: "Record a user's policy consent",
        security: bearerAuth,
        requestBody: jsonRequest("#/components/schemas/ConsentRequest"),
        responses: { 201: successResponse }
      })
    },
    "/health-history": {
      get: operation({
        tags: ["Health History"],
        summary: "List patient health history entries",
        security: bearerAuth
      }),
      post: stateChangingOperation({
        tags: ["Health History"],
        summary: "Create a patient health history entry",
        security: bearerAuth,
        requestBody: jsonRequest("#/components/schemas/HealthEntryCreateRequest"),
        responses: { 201: successResponse }
      })
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    },
    parameters: {
      CsrfToken: {
        name: "X-CSRF-Token",
        in: "header",
        required: true,
        schema: { type: "string" },
        description: "Use the token returned by GET /auth/csrf. The same request must include the mx_csrf cookie set by that endpoint."
      },
      Id: {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "string", format: "uuid" }
      },
      Page: {
        name: "page",
        in: "query",
        schema: { type: "integer", minimum: 1, default: 1 }
      },
      PageSize: {
        name: "pageSize",
        in: "query",
        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 }
      },
      Status: {
        name: "status",
        in: "query",
        schema: { type: "string" }
      }
    },
    responses: {
      BadRequest: { description: "Invalid request input", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
      Unauthorized: { description: "Authentication is required or invalid", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
      Forbidden: { description: "The request is forbidden", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
      NotFound: { description: "The resource was not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
      TooManyRequests: { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
      InternalServerError: { description: "Internal server error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
    },
    schemas: {
      SuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: { nullable: true },
          error: { nullable: true },
          meta: { type: "object" }
        }
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          data: { nullable: true, example: null },
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "INVALID_INPUT" },
              message: { type: "string", example: "Invalid request input." },
              details: { nullable: true }
            }
          },
          meta: { type: "object" }
        }
      },
      RegisterRequest: {
        type: "object",
        required: ["email", "password", "firstName", "lastName"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8, maxLength: 128, format: "password" },
          firstName: { type: "string", maxLength: 80 },
          lastName: { type: "string", maxLength: 80 },
          consentPromptLearning: { type: "boolean", default: false }
        }
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", format: "password" }
        }
      },
      PasswordResetRequest: {
        type: "object",
        required: ["email"],
        properties: { email: { type: "string", format: "email" } }
      },
      PasswordResetConfirmRequest: {
        type: "object",
        required: ["token", "password"],
        properties: {
          token: { type: "string", minLength: 32 },
          password: { type: "string", minLength: 8, maxLength: 128, format: "password" }
        }
      },
      EmailVerifyRequest: {
        type: "object",
        required: ["token"],
        properties: { token: { type: "string", minLength: 20 } }
      },
      UpdateProfileRequest: {
        type: "object",
        properties: {
          firstName: { type: "string", maxLength: 80 },
          lastName: { type: "string", maxLength: 80 },
          consentPromptLearning: { type: "boolean" },
          metadata: { type: "object", additionalProperties: true }
        }
      },
      ReportUploadRequest: {
        type: "object",
        required: ["report"],
        properties: {
          report: { type: "string", format: "binary" },
          title: { type: "string", maxLength: 180 }
        }
      },
      AiChatRequest: {
        type: "object",
        required: ["message"],
        properties: {
          message: { type: "string", minLength: 1, maxLength: 4000 },
          reportId: { type: "string", format: "uuid" }
        }
      },
      AiFeedbackRequest: {
        type: "object",
        required: ["interactionId", "rating"],
        properties: {
          interactionId: { type: "string", format: "uuid" },
          rating: { type: "integer", minimum: 1, maximum: 5 },
          comment: { type: "string", maxLength: 1000 }
        }
      },
      AppointmentCreateRequest: {
        type: "object",
        required: ["scheduledAt", "reason"],
        properties: {
          doctorId: { type: "string", format: "uuid" },
          scheduledAt: { type: "string", format: "date-time" },
          reason: { type: "string", maxLength: 1000 },
          notes: { type: "string", maxLength: 2000 }
        }
      },
      AppointmentStatusRequest: {
        type: "object",
        required: ["status"],
        properties: {
          status: { type: "string", enum: ["requested", "confirmed", "completed", "cancelled"] }
        }
      },
      JobCreateRequest: {
        type: "object",
        required: ["title", "description"],
        properties: {
          title: { type: "string", maxLength: 180 },
          description: { type: "string", maxLength: 5000 },
          specialty: { type: "string", maxLength: 180 },
          status: { type: "string", enum: ["draft", "published"], default: "draft" }
        }
      },
      ApplicationCreateRequest: {
        type: "object",
        required: ["jobId", "email", "firstName", "lastName"],
        properties: {
          jobId: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          firstName: { type: "string", maxLength: 80 },
          lastName: { type: "string", maxLength: 80 },
          phone: { type: "string", maxLength: 50 },
          cv: { type: "string", format: "binary" }
        }
      },
      ApplicationReviewRequest: {
        type: "object",
        required: ["status"],
        properties: {
          status: { type: "string", enum: ["accepted", "rejected"] }
        }
      },
      CreateDoctorRequest: {
        type: "object",
        required: ["email", "firstName", "lastName", "specialty"],
        properties: {
          email: { type: "string", format: "email" },
          firstName: { type: "string", maxLength: 80 },
          lastName: { type: "string", maxLength: 80 },
          specialty: { type: "string", maxLength: 120 },
          licenseNumber: { type: "string", maxLength: 120 },
          bio: { type: "string", maxLength: 1000 }
        }
      },
      ConsentRequest: {
        type: "object",
        required: ["policySlug", "policyVersion", "accepted"],
        properties: {
          policySlug: { type: "string", maxLength: 120 },
          policyVersion: { type: "string", maxLength: 40 },
          accepted: { type: "boolean" }
        }
      },
      HealthEntryCreateRequest: {
        type: "object",
        required: ["category", "title"],
        properties: {
          category: { type: "string", maxLength: 120 },
          title: { type: "string", maxLength: 180 },
          value: { type: "string", maxLength: 500 },
          recordedAt: { type: "string", format: "date-time" },
          metadata: { type: "object", additionalProperties: true }
        }
      }
    }
  }
};
