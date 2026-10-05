// Multipart handling for event photo uploads.
// Docs: 12-alumni-relations.md §3.3
//
// Deliberately a near-copy of the upload block in
// `modules/accounts/expenses.routes.ts`. It could be lifted into a shared
// `lib/upload.ts`, but two call sites with different allow-lists is not yet
// enough shared surface to justify a general abstraction — and the security
// rules below (random filenames, MIME allow-list, size cap) are the kind of thing
// that must be identical everywhere, so they are written out in full here rather
// than half-inherited.

import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { unprocessable } from '../../lib/errors.js';

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

/** Images only — a photo gallery has no use for a PDF. */
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif']);

export const photoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    // The stored name is random and extension-derived — never the client's
    // filename, which is attacker-controlled and could contain path separators
    // (`../../etc/passwd`) or a double extension that gets served as something it
    // is not.
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).slice(0, 10).replace(/[^.\w]/g, '') || '.bin';
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(unprocessable(`A photo must be a JPEG, PNG, WebP, HEIC or GIF — got ${file.mimetype}`));
      return;
    }
    cb(null, true);
  },
});