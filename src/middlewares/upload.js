import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { env, getAllowedMimeTypes } from "../config/env.js";
import { createId } from "../utils/uuid.js";
import { errors } from "../utils/errors.js";

const allowedMimeTypes = new Set(getAllowedMimeTypes());
const publicRoot = path.resolve("public");
const uploadRoot = path.resolve(env.UPLOAD_ROOT);
const allowedExtensionsByMime = new Map([
  ["application/pdf", new Set([".pdf"])],
  ["image/png", new Set([".png"])],
  ["image/jpeg", new Set([".jpg", ".jpeg"])],
  ["image/webp", new Set([".webp"])]
]);
const eicarSignature = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!";

if (uploadRoot === publicRoot || uploadRoot.startsWith(`${publicRoot}${path.sep}`)) {
  throw errors.config("UPLOAD_ROOT must not be inside the public directory.");
}

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function safeOriginalName(originalname) {
  return path.basename(String(originalname || "upload")).replace(/[^\w.\- ]/g, "_").slice(0, 180);
}

function destinationForField(fieldname) {
  const map = {
    report: "reports",
    avatar: "avatars",
    certificate: "certificates",
    license: "certificates",
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
    file.originalname = safeOriginalName(file.originalname);
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${createId()}${extension}`);
  }
});

function hasMagicBytes(buffer, mimeType) {
  if (mimeType === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mimeType === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}

async function scanForMalware(filePath) {
  const sample = await fs.promises.readFile(filePath, { encoding: "utf8" }).catch(() => "");
  if (sample.includes(eicarSignature)) {
    throw errors.badRequest("Uploaded file failed malware scanning.");
  }
}

async function removeRejectedFile(file) {
  if (!file?.path) return;
  await fs.promises.unlink(file.path).catch(() => {});
}

export const upload = multer({
  storage,
  limits: {
    fileSize: env.MAX_UPLOAD_BYTES
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!allowedMimeTypes.has(file.mimetype) || !allowedExtensionsByMime.get(file.mimetype)?.has(extension)) {
      return callback(errors.badRequest(`Unsupported file type: ${file.mimetype}`));
    }
    return callback(null, true);
  }
});

export async function validateUploadedFile(req, _res, next) {
  try {
    const file = req.file;
    if (!file) return next();
    const resolvedPath = path.resolve(file.path);
    if (!resolvedPath.startsWith(`${uploadRoot}${path.sep}`)) {
      await removeRejectedFile(file);
      return next(errors.badRequest("Invalid upload path."));
    }
    const header = await fs.promises.open(resolvedPath, "r");
    const buffer = Buffer.alloc(16);
    await header.read(buffer, 0, buffer.length, 0);
    await header.close();
    if (!hasMagicBytes(buffer, file.mimetype)) {
      await removeRejectedFile(file);
      return next(errors.badRequest("Uploaded file content does not match the declared file type."));
    }
    await scanForMalware(resolvedPath);
    return next();
  } catch (error) {
    await removeRejectedFile(req.file);
    return next(error);
  }
}

export async function validateUploadedFiles(req, _res, next) {
  const files = Object.values(req.files || {}).flat();
  try {
    for (const file of files) {
      const resolvedPath = path.resolve(file.path);
      if (!resolvedPath.startsWith(`${uploadRoot}${path.sep}`)) {
        await removeRejectedFile(file);
        return next(errors.badRequest("Invalid upload path."));
      }
      const header = await fs.promises.open(resolvedPath, "r");
      const buffer = Buffer.alloc(16);
      await header.read(buffer, 0, buffer.length, 0);
      await header.close();
      if (!hasMagicBytes(buffer, file.mimetype)) {
        await removeRejectedFile(file);
        return next(errors.badRequest("Uploaded file content does not match the declared file type."));
      }
      await scanForMalware(resolvedPath);
    }
    return next();
  } catch (error) {
    await Promise.all(files.map(removeRejectedFile));
    return next(error);
  }
}
