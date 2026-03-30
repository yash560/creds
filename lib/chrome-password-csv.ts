/** Parse Google Chrome–exported password CSV and classify rows. */

export type ChromePasswordRow = {
  name: string;
  url: string;
  username: string;
  password: string;
  lineIndex: number;
};

export type RowStatus =
  | { kind: 'valid'; row: ChromePasswordRow; dedupeKey: string }
  | { kind: 'invalid'; lineIndex: number; reason: 'missing_username' | 'missing_password' | 'missing_both'; raw: ChromePasswordRow }
  | { kind: 'duplicate_in_file'; row: ChromePasswordRow; dedupeKey: string }
  | { kind: 'duplicate_in_vault'; row: ChromePasswordRow; dedupeKey: string };

const CHROME_HEADERS = ['name', 'url', 'username', 'password'];

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((c === ',' && !inQuotes) || c === '\r') {
      if (c === ',') {
        out.push(cur);
        cur = '';
      }
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

export function normalizeLoginKey(url: string, username: string): string {
  const u = username.trim().toLowerCase();
  let host = '';
  const raw = url.trim();
  if (!raw) return `||${u}`;
  try {
    const parsed = new URL(raw.includes('://') ? raw : `https://${raw}`);
    host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    host = raw.toLowerCase().replace(/^www\./, '');
  }
  return `${host}|${u}`;
}

export function parseChromePasswordCSV(text: string): {
  headersOk: boolean;
  rows: ChromePasswordRow[];
} {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headersOk: false, rows: [] };

  const headerCells = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase().replace(/^\ufeff/, ''));
  const headerMap: Record<string, number> = {};
  headerCells.forEach((h, i) => {
    headerMap[h] = i;
  });

  const hasAll = CHROME_HEADERS.every((h) => headerMap[h] !== undefined);
  if (!hasAll) {
    return { headersOk: false, rows: [] };
  }

  const rows: ChromePasswordRow[] = [];
  for (let li = 1; li < lines.length; li++) {
    const cells = parseCSVLine(lines[li]);
    const get = (key: string) => (cells[headerMap[key]] ?? '').trim();
    rows.push({
      name: get('name'),
      url: get('url'),
      username: get('username'),
      password: get('password'),
      lineIndex: li + 1,
    });
  }
  return { headersOk: true, rows };
}

export function classifyChromeRows(
  parsed: ChromePasswordRow[],
  existingKeys: Set<string>
): {
  toImport: ChromePasswordRow[];
  report: RowStatus[];
  counts: {
    invalid: number;
    duplicateInFile: number;
    duplicateInVault: number;
    valid: number;
  };
} {
  const seenInFile = new Set<string>();
  const report: RowStatus[] = [];
  const toImport: ChromePasswordRow[] = [];
  const counts = { invalid: 0, duplicateInFile: 0, duplicateInVault: 0, valid: 0 };

  for (const row of parsed) {
    const hasU = !!row.username.trim();
    const hasP = !!row.password.trim();
    if (!hasU && !hasP) {
      counts.invalid++;
      report.push({ kind: 'invalid', lineIndex: row.lineIndex, reason: 'missing_both', raw: row });
      continue;
    }
    if (!hasU) {
      counts.invalid++;
      report.push({ kind: 'invalid', lineIndex: row.lineIndex, reason: 'missing_username', raw: row });
      continue;
    }
    if (!hasP) {
      counts.invalid++;
      report.push({ kind: 'invalid', lineIndex: row.lineIndex, reason: 'missing_password', raw: row });
      continue;
    }

    const dedupeKey = normalizeLoginKey(row.url, row.username);
    if (seenInFile.has(dedupeKey)) {
      counts.duplicateInFile++;
      report.push({ kind: 'duplicate_in_file', row, dedupeKey });
      continue;
    }
    seenInFile.add(dedupeKey);

    if (existingKeys.has(dedupeKey)) {
      counts.duplicateInVault++;
      report.push({ kind: 'duplicate_in_vault', row, dedupeKey });
      continue;
    }

    counts.valid++;
    report.push({ kind: 'valid', row, dedupeKey });
    toImport.push(row);
  }

  return { toImport, report, counts };
}
