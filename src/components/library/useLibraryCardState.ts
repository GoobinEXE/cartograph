import { useState } from 'react';
import type { SavedPaperItem } from '../../types/academic';
import { resolveUnpaywallPdf } from '../../services/unpaywallResolver';
import { formatInTextCitation } from '../../utils/citationExporter';
import type { UnpaywallLookup } from './libraryShared';

export interface LibraryCardState {
  expandedDetails: Record<string, boolean>;
  toggleDetails: (paperId: string) => void;
  expandedQuality: Record<string, boolean>;
  toggleQuality: (paperId: string) => void;
  copiedInTextKey: string | null;
  copyInTextCitation: (item: SavedPaperItem, style: 'abnt' | 'apa') => Promise<void>;
  linkingTargetId: string | null;
  linkCandidateId: string;
  setLinkCandidateId: (paperId: string) => void;
  /** Opens the preprint-link picker on `item` (preselecting another paper) or closes it. */
  toggleLinking: (item: SavedPaperItem, library: readonly SavedPaperItem[]) => void;
  closeLinking: () => void;
  unpaywallState: Record<string, UnpaywallLookup>;
  findUnpaywall: (item: SavedPaperItem) => Promise<void>;
}

/**
 * Per-card UI state of the library matrix, keyed by paper ID. It lives in the drawer root so
 * expanded panels and lookups survive switching to the PRISMA or bibliometrics tab and back.
 */
export function useLibraryCardState(unpaywallEmail: string | undefined): LibraryCardState {
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});
  const [expandedQuality, setExpandedQuality] = useState<Record<string, boolean>>({});
  const [copiedInTextKey, setCopiedInTextKey] = useState<string | null>(null);
  const [linkingTargetId, setLinkingTargetId] = useState<string | null>(null);
  const [linkCandidateId, setLinkCandidateId] = useState<string>('');
  const [unpaywallState, setUnpaywallState] = useState<Record<string, UnpaywallLookup>>({});

  const copyInTextCitation = async (item: SavedPaperItem, style: 'abnt' | 'apa') => {
    const text = formatInTextCitation(item, style, 'parenthetical');
    try {
      await navigator.clipboard.writeText(text);
      const key = `${style}-${item.id}`;
      setCopiedInTextKey(key);
      setTimeout(() => setCopiedInTextKey(null), 1800);
    } catch {
      // ignore
    }
  };

  const findUnpaywall = async (item: SavedPaperItem) => {
    if (!item.doi) return;
    setUnpaywallState((prev) => ({ ...prev, [item.id]: { status: 'loading' } }));
    const res = await resolveUnpaywallPdf(item.doi, unpaywallEmail);
    const resolved = res.bestPdfUrl || res.bestLandingUrl;
    if (res.ok && resolved) {
      setUnpaywallState((prev) => ({ ...prev, [item.id]: { status: 'found', pdfUrl: resolved } }));
    } else {
      setUnpaywallState((prev) => ({ ...prev, [item.id]: { status: 'not_found' } }));
    }
  };

  const closeLinking = () => {
    setLinkingTargetId(null);
    setLinkCandidateId('');
  };

  const toggleLinking = (item: SavedPaperItem, library: readonly SavedPaperItem[]) => {
    if (linkingTargetId === item.id) {
      closeLinking();
    } else {
      const firstCandidate = library.find((other) => other.id !== item.id);
      setLinkingTargetId(item.id);
      setLinkCandidateId(firstCandidate?.id ?? '');
    }
  };

  return {
    expandedDetails,
    toggleDetails: (paperId) => setExpandedDetails((prev) => ({ ...prev, [paperId]: !prev[paperId] })),
    expandedQuality,
    toggleQuality: (paperId) => setExpandedQuality((prev) => ({ ...prev, [paperId]: !prev[paperId] })),
    copiedInTextKey,
    copyInTextCitation,
    linkingTargetId,
    linkCandidateId,
    setLinkCandidateId,
    toggleLinking,
    closeLinking,
    unpaywallState,
    findUnpaywall,
  };
}
