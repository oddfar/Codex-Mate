import fs from 'fs';
import path from 'path';

export function readFileIfExists(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e: any) {
    if (e && (e.code === 'ENOENT' || e.code === 'ENOTDIR')) return null;
    throw e;
  }
}

export function atomicWriteFileSync(filePath: string, content: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, filePath);
}

export function readJsonIfExists<T = any>(filePath: string): T | null {
  const raw = readFileIfExists(filePath);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJsonSync(filePath: string, obj: any) {
  atomicWriteFileSync(filePath, JSON.stringify(obj, null, 2) + '\n');
}
