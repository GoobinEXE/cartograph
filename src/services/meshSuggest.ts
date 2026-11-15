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
    const searchRes = await fetch(searchUrl, {
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!searchRes.ok) {
      return { ok: false, terms: [], error: `NCBI esearch HTTP ${searchRes.status}` };
    }
    const searchJson = (await searchRes.json()) as {
      esearchresult?: { idlist?: string[] };
    };
    const ids = (searchJson?.esearchresult?.idlist || []).filter(
      (id): id is string => typeof id === 'string' && id.trim().length > 0
    );
    if (ids.length === 0) {
      return { ok: true, terms: [] };
    }

    const summaryUrl = `${NCBI_EUTILS_BASE}/esummary.fcgi?db=mesh&id=${encodeURIComponent(
      ids.join(',')
    )}&retmode=json`;
    const summaryRes = await fetch(summaryUrl, {
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!summaryRes.ok) {
      return { ok: false, terms: [], error: `NCBI esummary HTTP ${summaryRes.status}` };
    }

    const summaryJson = (await summaryRes.json()) as {
      result?: Record<string, Record<string, unknown>>;
    };
    const resultMap = summaryJson?.result || {};
    const terms: MeshDescriptorSuggestion[] = [];

    for (const id of ids) {
      const entry = resultMap[id];
      if (!entry || typeof entry !== 'object') continue;
      const meshList = Array.isArray(entry.ds_meshterms) ? entry.ds_meshterms : [];
      const headingRaw =
        (typeof meshList[0] === 'string' && meshList[0]) ||
        (typeof entry.title === 'string' && entry.title) ||
        '';
      const heading = headingRaw.trim();
      if (!heading) continue;
      const scopeNote =
        typeof entry.ds_scopenote === 'string' ? entry.ds_scopenote.trim() : '';
      terms.push({
        uid: id,
        heading,
        scopeNote,
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
