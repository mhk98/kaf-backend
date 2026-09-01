const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

// Where uploaded files are written on disk.
// Set IMAGE_UPLOAD_DIR to an absolute path OUTSIDE the deploy/repo directory
// (e.g. /home/<user>/kaf-uploads) so images survive redeploys.
// If that path is missing/unwritable (e.g. on a dev machine), fall back to the
// in-repo "images" folder so the server still starts.
const REPO_IMAGE_DIR = path.resolve("images");

function resolveUploadDir() {
  const configured = process.env.IMAGE_UPLOAD_DIR
    ? path.resolve(process.env.IMAGE_UPLOAD_DIR)
    : REPO_IMAGE_DIR;
  try {
    fs.mkdirSync(configured, { recursive: true });
    fs.accessSync(configured, fs.constants.W_OK);
    return configured;
  } catch (err) {
    if (configured !== REPO_IMAGE_DIR) {
      console.warn(
        `[upload] IMAGE_UPLOAD_DIR "${configured}" is not usable (${err.code || err.message}); ` +
          `falling back to "${REPO_IMAGE_DIR}". Uploads here may be lost on redeploy.`,
      );
    }
    fs.mkdirSync(REPO_IMAGE_DIR, { recursive: true });
    return REPO_IMAGE_DIR;
  }
}

const UPLOAD_DIR = resolveUploadDir();

// Allowed MIME types — zip removed (security risk)
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".jpeg",
  ".jpg",
  ".png",
  ".gif",
  ".webp",
  ".pdf",
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // UUID filename — prevents path traversal and originalname injection
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = ALLOWED_MIME_TYPES.has(file.mimetype);
  const extOk = ALLOWED_EXTENSIONS.has(ext);

  if (mimeOk && extOk) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file format. Allowed: jpeg, jpg, png, gif, webp, pdf"));
  }
};

const uploadFile = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
}).single("file");

const uploadPdf = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
}).single("file");

const uploadSingle = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
}).single("image");

const uploadUserDocuments = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
}).fields([
  { name: "image", maxCount: 1 },
  { name: "idCard", maxCount: 1 },
  { name: "cv", maxCount: 1 },
  { name: "guardianPhoto", maxCount: 1 },
  { name: "guardianIdCard", maxCount: 1 },
]);

const uploadMultiple = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
}).array("gallery_images", 10);

module.exports = {
  UPLOAD_DIR,
  uploadFile,
  uploadPdf,
  uploadSingle,
  uploadUserDocuments,
  uploadMultiple,
};
