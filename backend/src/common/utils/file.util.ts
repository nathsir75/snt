import path from 'path';
import fs from 'fs';
import { promises as fsp } from 'fs';
import { UploadCategory } from '../constants/upload.constants';

// ─── Resolve upload root from env ────────────────────────────────────────────

export function resolveUploadRoot(): string {
  const raw = process.env.UPLOAD_ROOT ?? 'uploads';
  // If relative, resolve from project root (process.cwd())
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
}

export function getMaxUploadBytes(): number {
  const mb = parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? '100', 10);
  return mb * 1024 * 1024;
}

// ─── Build structured storage path ───────────────────────────────────────────
// global  → uploads/global/{category}/
// branch  → uploads/branches/{branchId}/{category}/

export function buildStorageDir(ownerScope: 'global' | 'branch', category: UploadCategory, branchId?: number): string {
  const root = resolveUploadRoot();
  if (ownerScope === 'global') {
    return path.join(root, 'global', category);
  }
  if (!branchId) throw new Error('BRANCH_REQUIRED_FOR_SCOPE');
  return path.join(root, 'branches', String(branchId), category);
}

// ─── Build public serving URL ─────────────────────────────────────────────────
// Converts absolute disk path back to a /uploads/... URL

export function buildFileUrl(absolutePath: string): string {
  const root = resolveUploadRoot();
  const relative = path.relative(root, absolutePath).replace(/\\/g, '/');
  return `/uploads/${relative}`;
}

// ─── Ensure directory exists ──────────────────────────────────────────────────

export async function ensureDir(dirPath: string): Promise<void> {
  await fsp.mkdir(dirPath, { recursive: true });
}

// ─── Generate safe unique filename ───────────────────────────────────────────
// Strips unsafe characters, lowercases, prepends timestamp + random suffix

export function buildSafeFilename(originalName: string): string {
  const ext      = path.extname(originalName).toLowerCase();
  const baseName = path.basename(originalName, ext)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')   // replace anything not alphanumeric/dash/underscore
    .replace(/_+/g, '_')             // collapse multiple underscores
    .slice(0, 60);                   // cap base length

  const timestamp = Date.now();
  const suffix    = Math.random().toString(36).slice(2, 8);
  return `${timestamp}_${suffix}_${baseName}${ext}`;
}

// ─── Delete file from disk safely ────────────────────────────────────────────

export async function deleteFileFromDisk(absolutePath: string): Promise<{ deleted: boolean; warning?: string }> {
  try {
    await fsp.unlink(absolutePath);
    console.log(`[FileUtil] Deleted file — ${absolutePath}`);
    return { deleted: true };
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      console.warn(`[FileUtil] File not found on disk (already removed?) — ${absolutePath}`);
      return { deleted: false, warning: 'File not found on disk — DB record still updated' };
    }
    throw err; // re-throw unexpected errors
  }
}

// ─── Resolve absolute path from a /uploads/... URL ───────────────────────────

export function resolveAbsoluteFromUrl(fileUrl: string): string {
  // fileUrl looks like /uploads/branches/1/image/timestamp_file.jpg
  const relative = fileUrl.replace(/^\/uploads\//, '');
  return path.join(resolveUploadRoot(), relative);
}

// ─── Validate no path traversal ──────────────────────────────────────────────

export function assertNoPathTraversal(targetPath: string): void {
  const root = resolveUploadRoot();
  const resolved = path.resolve(targetPath);
  if (!resolved.startsWith(path.resolve(root))) {
    throw new Error('PATH_TRAVERSAL_DETECTED');
  }
}
