import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { env, getAllowedMimeTypes } from "../config/env.js";
import { createId } from "../utils/uuid.js";
import { errors } from "../utils/errors.js";

const allowedMimeTypes = new Set(getAllowedMimeTypes());

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function destinationForField(fieldname) {
  const map = {
    report: "reports",
    avatar: "avatars",
    certificate: "certificates",
    cv: "cv",
    document: "documents"
  };
  return map[fieldname] || "documents";
}

const storage = multer.diskStorage({
  destination: (_req, file, callback) => {
    const directory = path.join(env.UPLOAD_ROOT, destinationForField(file.fieldname));
    ensureDirectory(directory);
    callback(null, directory);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${createId()}${extension}`);
  }
});

export const upload = multer({
  storage,
  limits: {
    fileSize: env.MAX_UPLOAD_BYTES
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(errors.badRequest(`Unsupported file type: ${file.mimetype}`));
    }
    return callback(null, true);
  }
});
