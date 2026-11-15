import { SavedPaperItem } from '../types/academic';
import { parseAbstractMetadata } from './abstractParser';
import { normalizeDoi } from './deduplication';
import { sanitizeExternalUrl } from './urlSafety';

function cleanBibValue(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/\\&/g, '&')
    .replace(/---/g, '—')
    .replace(/--/g, '–')
    .replace(/[{}]/g, '')
    .trim();
}

function makeImportedId(prefix: string, seed: string, idx: number): string {
  const slug = seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return `imported-${prefix}-${slug || 'ref'}-${Date.now()}-${idx}`;
}

function parseBibFields(body: string): Record<string, string> {
  const fields: Record<string, string> = {};
  let i = 0;
  const len = body.length;

  while (i < len) {
    while (i < len && /[\s,]/.test(body[i])) i++;
    if (i >= len) break;

    const keyMatch = body.slice(i).match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*=/);
    if (!keyMatch) {
      i++;
      continue;
    }

    const key = keyMatch[1].toLowerCase();
    i += keyMatch[0].length;
    while (i < len && /\s/.test(body[i])) i++;
    if (i >= len) break;

    let value = '';
    const opener = body[i];

    if (opener === '{') {
      let depth = 0;
      const start = i + 1;
      while (i < len) {
        if (body[i] === '{') depth++;
        else if (body[i] === '}') {
          depth--;
          if (depth === 0) {
            value = body.slice(start, i);
            i++;
            break;
          }
        }
        i++;
      }
    } else if (opener === '"') {
      i++;
      const start = i;
      while (i < len) {
        if (body[i] === '"' && body[i - 1] !== '\\') {
          value = body.slice(start, i);
          i++;
          break;
        }
        i++;
      }
    } else {
      const start = i;
      while (i < len && body[i] !== ',' && body[i] !== '\n') i++;
      value = body.slice(start, i);
    }

    fields[key] = cleanBibValue(value);
  }

  return fields;
}

export function parseBibtexEntries(content: string): SavedPaperItem[] {
  const results: SavedPaperItem[] = [];
  const len = content.length;
  let i = 0;
  let idx = 0;

  while (i < len) {
    const atIndex = content.indexOf('@', i);
    if (atIndex === -1) break;

    const headerMatch = content.slice(atIndex).match(/^@([a-zA-Z]+)\s*[{(]/);
    if (!headerMatch) {
      i = atIndex + 1;
      continue;
    }

    const entryType = headerMatch[1].toLowerCase();
    if (entryType === 'comment' || entryType === 'preamble' || entryType === 'string') {
      i = atIndex + headerMatch[0].length;
      continue;
    }

    const openBracePos = atIndex + headerMatch[0].length - 1;
    const closeChar = content[openBracePos] === '(' ? ')' : '}';
    const openChar = content[openBracePos];

    let depth = 0;
    let endPos = openBracePos;
    while (endPos < len) {
      if (content[endPos] === openChar) depth++;
      else if (content[endPos] === closeChar) {
        depth--;
        if (depth === 0) break;
      }
      endPos++;
    }

    const rawEntry = content.slice(openBracePos + 1, endPos);
    i = endPos + 1;

    const commaPos = rawEntry.indexOf(',');
    if (commaPos === -1) continue;

    const citeKey = rawEntry.slice(0, commaPos).trim();
    const body = rawEntry.slice(commaPos + 1);
    const fields = parseBibFields(body);

    const title = fields.title;
    if (!title) continue;

    const authors = fields.author
      ? fields.author
          .split(/\s+and\s+/i)
          .map((a) => a.trim())
          .filter(Boolean)
      : [];

    const yearMatch = fields.year?.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? Number(yearMatch[0]) : null;
    const doi = normalizeDoi(fields.doi || null);
    const safeUrl =
      sanitizeExternalUrl(fields.url || null) ||
      (doi ? `https://doi.org/${doi}` : 'https://scholar.google.com/');
    const abstractText = fields.abstract || null;
    const venue = fields.journal || fields.booktitle || fields.publisher || 'Importado via BibTeX';

    results.push({
      id: makeImportedId('bib', citeKey || title, idx++),
      title,
      authors,
      year,
      venue,
      doi,
      url: safeUrl,
      pdfUrl: null,
      isOpenAccess: false,
      citationCount: 0,
      abstractText,
      source: 'crossref',
      sourceLabel: 'Importado (BibTeX)',
      publicationType: entryType,
      savedAt: new Date().toISOString(),
      researcherNotes: '',
      relevanceTag: 'media',
      screeningStatus: 'unscreened',
      extractedMetadata: parseAbstractMetadata(title, abstractText, entryType),
      groupId: null,
    });
  }

  return results;
}

export function parseRisEntries(content: string): SavedPaperItem[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const results: SavedPaperItem[] = [];

  let current: {
    ty?: string;
    title?: string;
    authors: string[];
    year: number | null;
    venue?: string;
    doi: string | null;
    url?: string;
    pdfUrl?: string;
    abstract?: string;
  } | null = null;
  let lastTag: string | null = null;
  let idx = 0;

  const finalize = () => {
    if (!current || !current.title) {
      current = null;
      return;
    }
    const doi = normalizeDoi(current.doi);
    const safeUrl =
      sanitizeExternalUrl(current.url || null) ||
      (doi ? `https://doi.org/${doi}` : 'https://scholar.google.com/');
    const safePdfUrl = sanitizeExternalUrl(current.pdfUrl || null);
    const abstractText = current.abstract?.trim() || null;

    results.push({
      id: makeImportedId('ris', doi || current.title, idx++),
      title: current.title.trim(),
      authors: current.authors,
      year: current.year,
      venue: current.venue?.trim() || 'Importado via RIS',
      doi,
      url: safeUrl,
      pdfUrl: safePdfUrl,
      isOpenAccess: Boolean(safePdfUrl),
      citationCount: 0,
      abstractText,
      source: 'crossref',
      sourceLabel: 'Importado (RIS)',
      publicationType: current.ty,
      savedAt: new Date().toISOString(),
      researcherNotes: '',
      relevanceTag: 'media',
      screeningStatus: 'unscreened',
      extractedMetadata: parseAbstractMetadata(current.title.trim(), abstractText, current.ty),
      groupId: null,
    });
    current = null;
    lastTag = null;
  };

  for (const rawLine of lines) {
    const tagMatch = rawLine.match(/^([A-Z0-9]{2})\s{1,2}-\s*(.*)$/);
    if (!tagMatch) {
      if (current && lastTag === 'AB' && rawLine.trim()) {
        current.abstract = `${current.abstract || ''} ${rawLine.trim()}`.trim();
      }
      continue;
    }

    const tag = tagMatch[1];
    const value = tagMatch[2].trim();
    lastTag = tag;

    if (tag === 'TY') {
      if (current) finalize();
      current = { ty: value, authors: [], year: null, doi: null };
      continue;
    }

    if (!current) continue;

    if (tag === 'ER') {
      finalize();
      continue;
    }

    switch (tag) {
      case 'TI':
      case 'T1':
        if (!current.title && value) current.title = value;
        break;
      case 'AU':
      case 'A1':
        if (value) current.authors.push(value);
        break;
      case 'PY':
      case 'Y1':
      case 'DA': {
        const yMatch = value.match(/\b(19|20)\d{2}\b/);
        if (yMatch && current.year === null) current.year = Number(yMatch[0]);
        break;
      }
      case 'JO':
      case 'JF':
      case 'T2':
      case 'JA':
        if (!current.venue && value) current.venue = value;
        break;
      case 'DO':
        if (!current.doi && value) current.doi = value;
        break;
      case 'UR':
        if (!current.url && value) current.url = value;
        break;
      case 'L1':
        if (!current.pdfUrl && value) current.pdfUrl = value;
        break;
      case 'AB':
      case 'N2':
        if (value) {
          current.abstract = current.abstract ? `${current.abstract} ${value}` : value;
        }
        break;
    }
  }

  if (current) finalize();
  return results;
}

export function parseImportedReferences(
  filename: string,
  content: string
): { items: SavedPaperItem[]; format: 'bibtex' | 'ris' | 'unknown' } {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.ris') || /(?:^|\n)TY\s{1,2}-/m.test(content)) {
    return { items: parseRisEntries(content), format: 'ris' };
  }
  if (lower.endsWith('.bib') || /@[a-zA-Z]+\s*[{(]/.test(content)) {
    return { items: parseBibtexEntries(content), format: 'bibtex' };
  }
  return { items: [], format: 'unknown' };
}
