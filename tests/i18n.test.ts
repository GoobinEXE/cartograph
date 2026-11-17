import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isSupportedLanguage,
  resolveLanguageFromTags,
} from '../src/i18n/context.tsx';
import { TRANSLATIONS } from '../src/i18n/translations.ts';
import { PLATFORMS } from '../src/data/platforms.ts';
import { getLocalizedPlatformInfo, PLATFORM_TRANSLATIONS_EN } from '../src/data/platformsEn.ts';
import { parseAbstractMetadata } from '../src/utils/abstractParser.ts';
import {
  calculatePrisma2020Counts,
  generatePrismaMethodologyText,
  SCREENING_REASON_LABELS_EN,
} from '../src/utils/prismaFlow.ts';
import { exportSavedPapersCsv } from '../src/utils/citationExporter.ts';
import type { SavedPaperItem } from '../src/types/academic.ts';

test('resolveLanguageFromTags maps system locales to Portuguese or English accurately', () => {
  assert.equal(resolveLanguageFromTags(['pt-BR', 'en-US']), 'pt');
  assert.equal(resolveLanguageFromTags(['pt-PT']), 'pt');
  assert.equal(resolveLanguageFromTags(['pt']), 'pt');
  assert.equal(resolveLanguageFromTags(['en-US', 'pt-BR']), 'en');
  assert.equal(resolveLanguageFromTags(['en-GB']), 'en');
  assert.equal(resolveLanguageFromTags(['en']), 'en');
  assert.equal(resolveLanguageFromTags(['fr-FR', 'es-ES']), 'en');
  assert.equal(resolveLanguageFromTags([]), 'en');
});

test('isSupportedLanguage accepts only pt and en', () => {
  assert.equal(isSupportedLanguage('pt'), true);
  assert.equal(isSupportedLanguage('en'), true);
  assert.equal(isSupportedLanguage('es'), false);
  assert.equal(isSupportedLanguage('fr'), false);
  assert.equal(isSupportedLanguage(null), false);
});

test('TRANSLATIONS pt and en expose identical non-empty key sets', () => {
  const ptKeys = Object.keys(TRANSLATIONS.pt).sort();
  const enKeys = Object.keys(TRANSLATIONS.en).sort();
  assert.deepEqual(enKeys, ptKeys);

  for (const key of ptKeys as Array<keyof typeof TRANSLATIONS.pt>) {
    assert.ok(TRANSLATIONS.pt[key].trim().length > 0, `Empty pt key: ${String(key)}`);
    assert.ok(TRANSLATIONS.en[key].trim().length > 0, `Empty en key: ${String(key)}`);
  }
});

test('PLATFORM_TRANSLATIONS_EN covers every platform in catalog', () => {
  assert.equal(PLATFORMS.length, 128);
  for (const platform of PLATFORMS) {
    const enEntry = PLATFORM_TRANSLATIONS_EN[platform.id];
    assert.ok(enEntry, `Missing English translation for platform: ${platform.id}`);
    assert.ok(enEntry.shortTag.trim().length > 0);
    assert.ok(enEntry.description.trim().length > 0);
    assert.ok(enEntry.coverageNote.trim().length > 0);

    const localizedEn = getLocalizedPlatformInfo(platform, 'en');
    assert.equal(localizedEn.description, enEntry.description);

    const localizedPt = getLocalizedPlatformInfo(platform, 'pt');
    assert.equal(localizedPt.description, platform.description);
  }
});

test('English utility outputs for abstractParser, prismaFlow, and citationExporter', () => {
  const metaEn = parseAbstractMetadata(
    'A systematic review and meta-analysis of machine learning in healthcare',
    'Objective: Evaluate diagnostic accuracy in a sample of 420 patients. Methods: Random-effects pooling. Results: AUC 0.91. Conclusion: High sensitivity.',
    'Review',
    'en'
  );
  assert.equal(metaEn.studyDesign, 'Systematic Review / Meta-Analysis');
  assert.ok(metaEn.sampleSize);
  assert.equal(metaEn.hasStructuredAbstract, true);

  const sampleItem: SavedPaperItem = {
    id: 'test-1',
    title: 'Sample Study',
    authors: ['Silva, M.'],
    year: 2025,
    venue: 'Nature',
    doi: '10.1000/test',
    url: 'https://example.org/test',
    pdfUrl: null,
    isOpenAccess: true,
    citationCount: 12,
    abstractText: 'Objective: Test PRISMA export.',
    source: 'openalex',
    sourceLabel: 'OpenAlex',
    savedAt: '2026-01-01T00:00:00.000Z',
    researcherNotes: '',
    relevanceTag: 'alta',
    screeningStatus: 'excluded',
    exclusionReason: 'populacao_inadequada',
    groupId: null,
  };

  const countsEn = calculatePrisma2020Counts([sampleItem], 10, 2, { OpenAlex: 10 }, 'en');
  assert.equal(countsEn.excludedReasons[SCREENING_REASON_LABELS_EN.populacao_inadequada], 1);

  const textEn = generatePrismaMethodologyText(countsEn, 'en');
  assert.match(textEn, /A total of 10 records were initially identified/);
  assert.match(textEn, /PRISMA 2020/);

  const csvEn = exportSavedPapersCsv([sampleItem], {}, 'en');
  assert.match(csvEn, /^\uFEFFGroup_Slot,Title,Authors,Year,Venue_Source,/);
  assert.match(csvEn, /"EXCLUDED"/);
  assert.match(csvEn, /"HIGH"/);
  assert.match(csvEn, /"Ungrouped \(General\)"/);
});

test('translate interpolates params and falls back to English for unknown languages', async () => {
  const { translate } = await import('../src/i18n/context.tsx');
  assert.equal(
    translate('pt', 'errorBoundaryBackupSaved', { papers: 3, groups: 1 }).startsWith('Backup salvo (artigos: 3; grupos: 1)'),
    true
  );
  assert.equal(
    translate('en', 'errorBoundaryBackupRejected', { count: 2 }).includes('emergencyRecovery field: 2.'),
    true
  );
  assert.equal(
    translate('xx' as never, 'errorBoundaryReload'),
    TRANSLATIONS.en.errorBoundaryReload
  );
});
