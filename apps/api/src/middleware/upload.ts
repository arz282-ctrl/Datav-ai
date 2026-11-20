import crypto from "crypto";
import fs from "fs";
import path from "path";
import multer from "multer";
import { fileTypeFromFile } from "file-type";
import { config } from "../config.js";

// Validated allowed extensions
export const ALLOWED_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg", "tiff", "tif", "xlsx", "xls", "csv"]);

// Ensure upload directory exists
if (!fs.existsSync(config.dataUploadsDir)) {
  try {
    fs.mkdirSync(config.dataUploadsDir, { recursive: true });
  } catch (e) {
    // If not writable in dev or root, fall back to /tmp/uploads
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dest = fs.existsSync(config.dataUploadsDir) ? config.dataUploadsDir : "/tmp";
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const rawExt = path.extname(file.originalname).toLowerCase().replace(".", "");
    const safeExt = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : "bin";
    const fileUuid = crypto.randomUUID();
    cb(null, `${fileUuid}.${safeExt}`);
  },
});

export const multerUpload = multer({
  storage,
  limits: {
    fileSize: config.maxUploadMb * 1024 * 1024,
    files: 20,
  },
});

export interface FileValidationResult {
  valid: boolean;
  mimeType: string;
  detectedExt: string;
  errorCode?: string;
  errorMessage?: string;
}

export function sniffCsv(filePath: string): boolean {
  try {
    const buffer = Buffer.alloc(4096);
    const fd = fs.openSync(filePath, "r");
    const bytesRead = fs.readSync(fd, buffer, 0, 4096, 0);
    fs.closeSync(fd);

    if (bytesRead === 0) return false;

    // Check for NUL bytes (binary files have NULs)
    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0) return false;
    }

    const text = buffer.toString("utf-8", 0, bytesRead);
    // Must contain standard delimiters
    return text.includes(",") || text.includes("\t") || text.includes(";");
  } catch (err) {
    return false;
  }
}

export async function validateUploadedFile(filePath: string, originalName: string): Promise<FileValidationResult> {
  const ext = path.extname(originalName).toLowerCase().replace(".", "");
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      mimeType: "application/octet-stream",
      detectedExt: ext,
      errorCode: "UNSUPPORTED_EXTENSION",
      errorMessage: `Extension .${ext} is not allowed.`,
    };
  }

  // Handle CSV sniffing
  if (ext === "csv") {
    const isCsv = sniffCsv(filePath);
    if (!isCsv) {
      return {
        valid: false,
        mimeType: "text/csv",
        detectedExt: "csv",
        errorCode: "INVALID_CSV_CONTENT",
        errorMessage: "File does not appear to be a valid text-delimited CSV.",
      };
    }
    return {
      valid: true,
      mimeType: "text/csv",
      detectedExt: "csv",
    };
  }

  // Handle magic bytes with file-type
  const detected = await fileTypeFromFile(filePath);
  if (!detected) {
    // Check CFB for XLS
    const buf = Buffer.alloc(8);
    const fd = fs.openSync(filePath, "r");
    fs.readSync(fd, buf, 0, 8, 0);
    fs.closeSync(fd);
    // Compound file binary signature: D0 CF 11 E0 A1 B1 1A E1
    if (ext === "xls" && buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) {
      return {
        valid: true,
        mimeType: "application/vnd.ms-excel",
        detectedExt: "xls",
      };
    }

    return {
      valid: false,
      mimeType: "unknown",
      detectedExt: "unknown",
      errorCode: "MAGIC_BYTE_MISMATCH",
      errorMessage: "Could not verify valid file signature.",
    };
  }

  // Match detected extension against filename extension
  const detectedExt = detected.ext as string;
  const isMatch =
    detectedExt === ext ||
    (ext === "jpg" && detectedExt === "jpeg") ||
    (ext === "jpeg" && detectedExt === "jpg") ||
    (ext === "tif" && detectedExt === "tiff") ||
    (ext === "tiff" && detectedExt === "tif") ||
    (ext === "xlsx" && (detectedExt === "zip" || detectedExt === "xlsx"));

  if (!isMatch) {
    return {
      valid: false,
      mimeType: detected.mime,
      detectedExt,
      errorCode: "MAGIC_BYTE_MISMATCH",
      errorMessage: `File signature (${detectedExt}) does not match declared extension (.${ext}).`,
    };
  }

  return {
    valid: true,
    mimeType: detected.mime,
    detectedExt,
  };
}
