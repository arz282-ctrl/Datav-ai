import fs from "fs";
import path from "path";
import os from "os";
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/index.js";
import { sniffCsv, validateUploadedFile } from "../src/middleware/upload.js";
import { config } from "../src/config.js";

describe("Upload Guard & Validation", () => {
  it("sniffCsv accepts valid delimited text and rejects binary files", () => {
    const tmpDir = os.tmpdir();

    const validCsvPath = path.join(tmpDir, "test_valid.csv");
    fs.writeFileSync(validCsvPath, "InvoiceNo,Vendor,Amount\nINV-1,Acme,100.00\n");

    const binaryCsvPath = path.join(tmpDir, "test_binary.csv");
    fs.writeFileSync(binaryCsvPath, Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe]));

    expect(sniffCsv(validCsvPath)).toBe(true);
    expect(sniffCsv(binaryCsvPath)).toBe(false);

    fs.unlinkSync(validCsvPath);
    fs.unlinkSync(binaryCsvPath);
  });

  it("validateUploadedFile rejects executable disguised as PDF", async () => {
    const tmpDir = os.tmpdir();
    const fakePdf = path.join(tmpDir, "fake.pdf");
    // Write fake ELF / Mach-O header
    fs.writeFileSync(fakePdf, Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x01, 0x01, 0x01]));

    const result = await validateUploadedFile(fakePdf, "fake.pdf");
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("MAGIC_BYTE_MISMATCH");

    fs.unlinkSync(fakePdf);
  });

  it("validateUploadedFile rejects unsupported extensions", async () => {
    const tmpDir = os.tmpdir();
    const testExe = path.join(tmpDir, "malicious.exe");
    fs.writeFileSync(testExe, "echo dangerous");

    const result = await validateUploadedFile(testExe, "malicious.exe");
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("UNSUPPORTED_EXTENSION");

    fs.unlinkSync(testExe);
  });
});
