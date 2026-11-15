import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const projectRoot = resolve(import.meta.dirname, '..');
const testsDir = join(projectRoot, 'tests');
const esbuildBin = join(
  projectRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'esbuild.cmd' : 'esbuild'
);

const testFiles = readdirSync(testsDir)
  .filter((name) => name.endsWith('.test.ts'))
  .sort();

if (testFiles.length === 0) {
  console.error('No *.test.ts files found in tests/.');
  process.exit(1);
}

const outDir = mkdtempSync(join(tmpdir(), 'cartograph-tests-'));

try {
  const compiledFiles = [];

  for (const file of testFiles) {
    const entry = join(testsDir, file);
    const outFile = join(outDir, file.replace(/\.test\.ts$/, '.test.mjs'));
    const buildResult = spawnSync(
      esbuildBin,
      [
        entry,
        '--bundle',
        '--platform=node',
        '--format=esm',
        `--outfile=${outFile}`,
      ],
      { stdio: 'inherit', cwd: projectRoot }
    );

    if (buildResult.status !== 0) {
      process.exit(buildResult.status ?? 1);
    }
    compiledFiles.push(outFile);
  }

  const testResult = spawnSync(process.execPath, ['--test', ...compiledFiles], {
    stdio: 'inherit',
    cwd: projectRoot,
  });

  process.exitCode = testResult.status ?? 1;
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
