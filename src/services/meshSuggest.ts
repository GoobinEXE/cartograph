import { asArray, asRecord, asString, asStringList, firstString, isRecord } from '../utils/json';
import { fetchJsonDirect } from './httpClient';

export interface MeshDescriptorSuggestion {
  uid: string;
  heading: string;
  scopeNote: string;
}

export interface MeshSuggestResponse {
  ok: boolean;
  terms: MeshDescriptorSuggestion[];
  error?: string;
}

const NCBI_EUTILS_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

export async function suggestMeshTerms(
  query: string,
  signal?: AbortSignal
): Promise<MeshSuggestResponse> {
  const cleaned = query.trim();
  if (cleaned.length < 2) {
    return { ok: true, terms: [] };
  }

  try {
    const searchUrl = `${NCBI_EUTILS_BASE}/esearch.fcgi?db=mesh&term=${encodeURIComponent(
      cleaned
    )}&retmax=8&retmode=json`;
    // HTTP failures surface as HttpStatusError("NCBI esearch HTTP <status>") and land in the catch below.
    const searchJson = await fetchJsonDirect(searchUrl, 'NCBI esearch', { signal });
    const ids = asStringList(asRecord(asRecord(searchJson).esearchresult).idlist);
    if (ids.length === 0) {
      return { ok: true, terms: [] };
    }

    const summaryUrl = `${NCBI_EUTILS_BASE}/esummary.fcgi?db=mesh&id=${encodeURIComponent(
      ids.join(',')
    )}&retmode=json`;
    const summaryJson = await fetchJsonDirect(summaryUrl, 'NCBI esummary', { signal });
    const resultMap = asRecord(asRecord(summaryJson).result);
    const terms: MeshDescriptorSuggestion[] = [];

    for (const id of ids) {
      const entry = resultMap[id];
      if (!isRecord(entry)) continue;
      const heading = firstString(asArray(entry.ds_meshterms)[0], entry.title);
      if (!heading) continue;
      terms.push({
        uid: id,
        heading,
        scopeNote: asString(entry.ds_scopenote) ?? '',
      });
    }

    return { ok: true, terms };
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      return { ok: false, terms: [], error: 'Aborted' };
    }
    return {
      ok: false,
      terms: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function formatMeshInsertionTerm(heading: string): string {
  const clean = heading.replace(/"/g, '').trim();
  return `"${clean}"`;
}
