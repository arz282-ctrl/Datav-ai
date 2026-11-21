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
    const rawExt = path.extname(file.originalname).toLowerCase().replace(".", "").trim();
    const safeExt = /^[a-z0-9]{1,10}$/.test(rawExt) && ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : "bin";
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
  const rawExt = path.extname(originalName).toLowerCase().replace(".", "").trim();
  // An extension is valid only if it consists solely of alphanumeric characters without spaces/symbols (e.g. "pdf", "xlsx", "jpg")
  const declaredExt = /^[a-z0-9]{1,10}$/.test(rawExt) ? rawExt : "";

  // If the user explicitly declared an extension that is definitively not supported (e.g. .exe, .sh)
  if (declaredExt && !ALLOWED_EXTENSIONS.has(declaredExt)) {
    return {
      valid: false,
      mimeType: "application/octet-stream",
      detectedExt: declaredExt,
      errorCode: "UNSUPPORTED_EXTENSION",
      errorMessage: `Extension .${declaredExt} is not allowed.`,
    };
  }

  // Handle magic bytes with file-type
  const detected = await fileTypeFromFile(filePath);
  let detectedExt = detected?.ext ? (detected.ext as string) : "";
  let mimeType = detected?.mime || "application/octet-stream";

  // Check manual signatures if fileTypeFromFile didn't identify it
  if (!detectedExt) {
    try {
      const fd = fs.openSync(filePath, "r");
      const headBuf = Buffer.alloc(32);
      const bytesRead = fs.readSync(fd, headBuf, 0, 32, 0);
      fs.closeSync(fd);

      if (bytesRead >= 4 && headBuf.toString("utf-8", 0, 4) === "%PDF") {
        detectedExt = "pdf";
        mimeType = "application/pdf";
      } else if (bytesRead >= 8 && headBuf[0] === 0xd0 && headBuf[1] === 0xcf && headBuf[2] === 0x11 && headBuf[3] === 0xe0) {
        detectedExt = "xls";
        mimeType = "application/vnd.ms-excel";
      } else if (sniffCsv(filePath)) {
        detectedExt = "csv";
        mimeType = "text/csv";
      }
    } catch (e) {}
  }

  // Handle CSV sniffing if detectedExt is empty or declared as csv
  if (!detectedExt && sniffCsv(filePath)) {
    detectedExt = "csv";
    mimeType = "text/csv";
  }

  // If no extension was declared on the filename (e.g. "namecheap.com Order Summary ( Order# 201072949)"),
  // infer the document type from the verified magic bytes
  const effectiveExt = declaredExt || detectedExt;

  if (!effectiveExt || !ALLOWED_EXTENSIONS.has(effectiveExt)) {
    return {
      valid: false,
      mimeType: "unknown",
      detectedExt: detectedExt || "unknown",
      errorCode: declaredExt ? "UNSUPPORTED_EXTENSION" : "MAGIC_BYTE_MISMATCH",
      errorMessage: declaredExt
        ? `Extension .${declaredExt} is not allowed.`
        : "Could not verify valid document signature.",
    };
  }

  // Handle CSV verification
  if (effectiveExt === "csv") {
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

  // Match detected extension against declared extension (if one was declared)
  if (declaredExt) {
    const isMatch =
      detectedExt === declaredExt ||
      (declaredExt === "jpg" && detectedExt === "jpeg") ||
      (declaredExt === "jpeg" && detectedExt === "jpg") ||
      (declaredExt === "tif" && detectedExt === "tiff") ||
      (declaredExt === "tiff" && detectedExt === "tif") ||
      (declaredExt === "xlsx" && (detectedExt === "zip" || detectedExt === "xlsx"));

    if (!isMatch) {
      return {
        valid: false,
        mimeType,
        detectedExt,
        errorCode: "MAGIC_BYTE_MISMATCH",
        errorMessage: `File signature (${detectedExt || "unknown"}) does not match declared extension (.${declaredExt}).`,
      };
    }
  }

  return {
    valid: true,
    mimeType,
    detectedExt: effectiveExt,
  };
}
