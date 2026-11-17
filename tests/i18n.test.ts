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

test('resolveLanguageFromTags maps system locales to the four UI languages', () => {
  assert.equal(resolveLanguageFromTags(['pt-BR', 'en-US']), 'pt');
  assert.equal(resolveLanguageFromTags(['pt-PT']), 'pt');
  assert.equal(resolveLanguageFromTags(['pt']), 'pt');
  assert.equal(resolveLanguageFromTags(['en-US', 'pt-BR']), 'en');
  assert.equal(resolveLanguageFromTags(['en-GB']), 'en');
  assert.equal(resolveLanguageFromTags(['en']), 'en');
  assert.equal(resolveLanguageFromTags(['fr-FR', 'es-ES']), 'fr');
  assert.equal(resolveLanguageFromTags(['es-419']), 'es');
  assert.equal(resolveLanguageFromTags(['de-DE', 'it-IT']), 'en');
  assert.equal(resolveLanguageFromTags([]), 'en');
});

test('isSupportedLanguage accepts exactly the registered locales', () => {
  for (const code of ['pt', 'en', 'es', 'fr']) assert.equal(isSupportedLanguage(code), true);
  assert.equal(isSupportedLanguage('de'), false);
  assert.equal(isSupportedLanguage('toString'), false);
  assert.equal(isSupportedLanguage(null), false);
});

test('every locale exposes the same non-empty keys with the same {param} placeholders', () => {
  const placeholders = (text: string) => [...text.matchAll(/\{([a-zA-Z]+)\}/g)].map((m) => m[1]).sort();
  const reference = TRANSLATIONS.en;
  const referenceKeys = Object.keys(reference).sort();
  for (const [code, dictionary] of Object.entries(TRANSLATIONS)) {
    assert.deepEqual(Object.keys(dictionary).sort(), referenceKeys, `key set differs in ${code}`);
    for (const key of referenceKeys as Array<keyof typeof reference>) {
      const value = dictionary[key];
      assert.ok(value.trim().length > 0, `Empty ${code} key: ${String(key)}`);
      assert.deepEqual(placeholders(value), placeholders(reference[key]), `placeholders differ in ${code}.${String(key)}`);
    }
  }
});

test('PLATFORM_TRANSLATIONS_EN covers every platform in catalog', () => {
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
