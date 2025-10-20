import { ConfigToml, Primitive } from './types';

function stripInlineComment(line: string): string {
  let inQuotes = false;
  let escaped = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (!escaped && ch === '"') inQuotes = !inQuotes;
    if (!inQuotes && ch === '#') return line.slice(0, i).trimEnd();
    escaped = !escaped && ch === '\\';
  }
  return line;
}

function parseArray(value: string): any[] {
  // Very simple array parser for strings/numbers
  const arr: any[] = [];
  let buf = '';
  let inQuotes = false;
  let escaped = false;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (!escaped && ch === '"') {
      inQuotes = !inQuotes;
      buf += ch;
      continue;
    }
    if (!inQuotes && ch === ',') {
      const v = buf.trim();
      if (v) arr.push(parseValue(v));
      buf = '';
      continue;
    }
    if (!inQuotes && (ch === '[' || ch === ']')) {
      buf += ch;
      continue;
    }
    buf += ch;
    escaped = !escaped && ch === '\\';
  }
  const tail = buf.trim();
  if (tail) arr.push(parseValue(tail));
  return arr;
}

function parseValue(raw: string): Primitive | Primitive[] {
  const s = raw.trim();
  if (s.startsWith('[') && s.endsWith(']')) {
    return parseArray(s);
  }
  if (s.startsWith('"') && s.endsWith('"')) {
    return JSON.parse(s.replace(/\\"/g, '"')) as string;
  }
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^[+-]?\d+(?:\.\d+)?$/.test(s)) return Number(s);
  // Fallback plain string without quotes
  return s;
}

function parseTablePath(header: string): string[] {
  // header like [a.b] or [projects."/abs/path"]
  const inner = header.slice(1, -1).trim();
  const parts: string[] = [];
  let buf = '';
  let inQuotes = false;
  let escaped = false;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (!escaped && ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && ch === '.') {
      parts.push(buf);
      buf = '';
      continue;
    }
    buf += ch;
    escaped = !escaped && ch === '\\';
  }
  if (buf.length) parts.push(buf);
  return parts.map(p => (p.startsWith('"') && p.endsWith('"') ? p.slice(1, -1) : p));
}

export function parseToml(content: string): ConfigToml {
  const obj: any = {};
  let currentPath: string[] = [];
  let pendingArray: string | null = null;
  let arrayBuffer: string[] = [];

  const lines = content.split(/\r?\n/);
  for (let rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;
    line = stripInlineComment(line).trim();
    if (!line) continue;

    if (pendingArray) {
      arrayBuffer.push(line);
      if (line.includes(']')) {
        const kv = pendingArray;
        const valueStr = arrayBuffer.join(' ');
        const value = parseValue(valueStr);
        setValue(obj, currentPath, kv, value);
        pendingArray = null;
        arrayBuffer = [];
      }
      continue;
    }

    if (line.startsWith('[') && line.endsWith(']')) {
      currentPath = parseTablePath(line);
      ensurePath(obj, currentPath);
      continue;
    }

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    const valueRaw = line.slice(eqIndex + 1).trim();
    if (valueRaw.startsWith('[') && !valueRaw.includes(']')) {
      // multiline array
      pendingArray = key;
      arrayBuffer = [valueRaw];
      continue;
    }
    const value = parseValue(valueRaw);
    setValue(obj, currentPath, key, value);
  }
  return obj as ConfigToml;
}

function ensurePath(root: any, path: string[]) {
  let node = root;
  for (const p of path) {
    if (!Object.prototype.hasOwnProperty.call(node, p)) node[p] = {};
    node = node[p];
  }
}

function setValue(root: any, path: string[], key: string, value: any) {
  let node = root;
  for (const p of path) {
    if (!Object.prototype.hasOwnProperty.call(node, p)) node[p] = {};
    node = node[p];
  }
  node[key] = value;
}

function isPrimitive(v: any): v is Primitive {
  return v === null || ['string', 'number', 'boolean'].includes(typeof v);
}

function formatPrimitive(v: Primitive): string {
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return 'null';
}

function formatArray(arr: any[]): string {
  return `[${arr.map(v => (Array.isArray(v) ? formatArray(v) : isPrimitive(v) ? formatPrimitive(v) : JSON.stringify(v))).join(', ')}]`;
}

function writeTableBlock(lines: string[], header: string, data: Record<string, any>) {
  lines.push(`[${header}]`);
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    if (isPrimitive(v)) {
      lines.push(`${k} = ${formatPrimitive(v)}`);
    } else if (Array.isArray(v)) {
      lines.push(`${k} = ${formatArray(v)}`);
    } else {
      // nested object: flatten one level with [header.k]
      writeTableBlock(lines, `${header}.${k}`, v);
    }
  }
  lines.push('');
}

export function stringifyToml(cfg: ConfigToml): string {
  const lines: string[] = [];
  // top-level primitives/arrays
  for (const [k, v] of Object.entries(cfg)) {
    if (k === 'model_providers' || k === 'mcp_servers' || k === 'projects') continue;
    if (isPrimitive(v)) {
      lines.push(`${k} = ${formatPrimitive(v)}`);
    } else if (Array.isArray(v)) {
      lines.push(`${k} = ${formatArray(v)}`);
    }
  }
  if (lines.length) lines.push('');

  if (cfg.model_providers) {
    for (const [name, provider] of Object.entries(cfg.model_providers)) {
      const p = { ...provider } as any;
      if (!p.name) p.name = name;
      writeTableBlock(lines, `model_providers.${name}`, p);
    }
  }

  if (cfg.mcp_servers) {
    for (const [name, mcp] of Object.entries(cfg.mcp_servers)) {
      writeTableBlock(lines, `mcp_servers.${name}`, mcp as any);
    }
  }

  if (cfg.projects) {
    for (const [projPath, proj] of Object.entries(cfg.projects)) {
      writeTableBlock(lines, `projects."${projPath}"`, proj as any);
    }
  }

  return lines.join('\n').trim() + '\n';
}
