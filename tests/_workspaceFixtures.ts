import type { NormalizedPaper, SavedPaperItem } from '../src/types/academic.ts';
import { createWorkspaceActions, type WorkspaceActionDeps } from '../src/state/workspace/workspaceActions.ts';
import { createWorkspaceStore, type WorkspaceStore } from '../src/state/workspace/workspaceStore.ts';

/** Shared builders for the workspace store tests (not picked up as a test: no `.test.ts`). */
export function makePaper(overrides: Partial<NormalizedPaper> = {}): NormalizedPaper {
  return {
    id: 'paper-1',
    title: 'Sample Study on Causal Forests',
    authors: ['Ana Silva'],
    year: 2024,
    venue: 'Journal of Computational Science',
    doi: null,
    url: 'https://example.org/paper-1',
    pdfUrl: null,
    isOpenAccess: false,
    citationCount: 3,
    abstractText: null,
    source: 'openalex',
    sourceLabel: 'OpenAlex',
    ...overrides,
  };
}

export function makeSaved(overrides: Partial<SavedPaperItem> = {}): SavedPaperItem {
  return {
    ...makePaper(overrides),
    savedAt: '2026-01-01T00:00:00.000Z',
    researcherNotes: '',
    relevanceTag: 'media',
    screeningStatus: 'unscreened',
    groupId: null,
    ...overrides,
  };
}

export interface TestWorkspace {
  store: WorkspaceStore;
  actions: ReturnType<typeof createWorkspaceActions>;
  tracked: Array<{ event: string; params?: Record<string, string | number | boolean> }>;
}

export function createTestWorkspace(overrides: Partial<WorkspaceActionDeps> = {}): TestWorkspace {
  const store = createWorkspaceStore();
  const tracked: TestWorkspace['tracked'] = [];
  let counter = 0;
  const actions = createWorkspaceActions(store, {
    now: () => new Date('2026-03-04T05:06:07.000Z'),
    randomSuffix: () => `r${++counter}`,
    getLanguage: () => 'en',
    track: (event, params) => tracked.push({ event, params }),
    ...overrides,
  });
  return { store, actions, tracked };
}

/** Manual clock for debounce tests. */
export function createManualTimers() {
  let now = 0;
  let nextId = 1;
  const pending = new Map<number, { at: number; callback: () => void }>();
  return {
    timers: {
      setTimeout: (callback: () => void, ms: number) => {
        const id = nextId++;
        pending.set(id, { at: now + ms, callback });
        return id as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimeout: (handle: ReturnType<typeof setTimeout>) => {
        pending.delete(handle as unknown as number);
      },
    },
    advance(ms: number) {
      now += ms;
      for (const [id, timer] of Array.from(pending.entries()).sort((a, b) => a[1].at - b[1].at)) {
        if (timer.at <= now && pending.has(id)) {
          pending.delete(id);
          timer.callback();
        }
      }
    },
    get pendingCount() {
      return pending.size;
    },
  };
}
