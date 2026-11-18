import { Suspense, lazy } from 'react';
import type { Prisma2020Counts, SavedPaperItem, ScreeningStatus } from '../../types/academic';
import { PrismaFlowDiagram } from '../PrismaFlowDiagram';

const BibliometricsPanel = lazy(() =>
  import('../BibliometricsPanel').then((m) => ({ default: m.BibliometricsPanel }))
);

/** PRISMA 2020 flow of the selected slot. */
export function LibraryPrismaTab({
  counts,
  onSelectStatusFilter,
}: {
  counts: Prisma2020Counts;
  onSelectStatusFilter?: (status: 'all' | ScreeningStatus) => void;
}) {
  return <PrismaFlowDiagram counts={counts} onSelectStatusFilter={onSelectStatusFilter} />;
}

/** SVG bibliometrics of the selected slot, loaded on first use. */
export function LibraryBibliometricsTab({ items }: { items: SavedPaperItem[] }) {
  return (
    <Suspense fallback={null}>
      <BibliometricsPanel items={items} />
    </Suspense>
  );
}
