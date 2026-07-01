// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import { createHash } from 'crypto';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getRepositoryRoot } from './pathTestUtils';

suite('WASM bundle verification scripts', () => {
  test('check-wasm-bundle accepts a matching fake bundle', () => {
    const fixture = createBundleFixture();
    const result = runNodeScript('scripts/check-wasm-bundle.mjs', [], {
      VERILOGHDL_REPO_ROOT: fixture.root,
      VERILOGHDL_SLANG_LOCK_FILE: fixture.lockPath,
      VERILOGHDL_WASM_DIR: fixture.wasmDir,
    });

    assert.strictEqual(result.status, 0, result.stderr);
    assert.match(result.stdout, /WASM bundle verified/);
  });

  test('check-wasm-bundle fails on metadata mismatch, missing license, and size limit', () => {
    const mismatch = createBundleFixture({ metadata: { slangCommit: 'wrong' } });
    const mismatchResult = runNodeScript('scripts/check-wasm-bundle.mjs', [], {
      VERILOGHDL_REPO_ROOT: mismatch.root,
      VERILOGHDL_SLANG_LOCK_FILE: mismatch.lockPath,
      VERILOGHDL_WASM_DIR: mismatch.wasmDir,
    });
    assert.notStrictEqual(mismatchResult.status, 0);
    assert.match(mismatchResult.stderr, /metadata slangCommit mismatch/);

    const missingLicense = createBundleFixture();
    fs.rmSync(path.join(missingLicense.wasmDir, 'licenses', 'slang.LICENSE'));
    const missingLicenseResult = runNodeScript('scripts/check-wasm-bundle.mjs', [], {
      VERILOGHDL_REPO_ROOT: missingLicense.root,
      VERILOGHDL_SLANG_LOCK_FILE: missingLicense.lockPath,
      VERILOGHDL_WASM_DIR: missingLicense.wasmDir,
    });
    assert.notStrictEqual(missingLicenseResult.status, 0);
    assert.match(missingLicenseResult.stderr, /missing required WASM bundle file/);

    const tooLarge = createBundleFixture({ lock: { wasmSizeLimitBytes: 2 } });
    const tooLargeResult = runNodeScript('scripts/check-wasm-bundle.mjs', [], {
      VERILOGHDL_REPO_ROOT: tooLarge.root,
      VERILOGHDL_SLANG_LOCK_FILE: tooLarge.lockPath,
      VERILOGHDL_WASM_DIR: tooLarge.wasmDir,
    });
    assert.notStrictEqual(tooLargeResult.status, 0);
    assert.match(tooLargeResult.stderr, /exceeds size limit/);
  });

  test('check-vsix-contents verifies required entries from a listing file', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wasm-vsix-list-'));
    const listingPath = path.join(root, 'listing.txt');
    fs.writeFileSync(listingPath, [
      'extension/resources/wasm/slang-server.wasm',
      'extension/resources/wasm/slang-server.meta.json',
      'extension/resources/wasm/licenses/slang-server.LICENSE',
      'extension/resources/wasm/licenses/slang.LICENSE',
      'extension/resources/wasm/licenses/THIRD_PARTY_NOTICES.md',
      '',
    ].join('\n'));

    const result = runNodeScript('scripts/check-vsix-contents.mjs', [], {
      VERILOGHDL_VSIX_LISTING_FILE: listingPath,
    });
    assert.strictEqual(result.status, 0, result.stderr);

    fs.writeFileSync(listingPath, 'extension/resources/wasm/slang-server.wasm\n');
    const missingResult = runNodeScript('scripts/check-vsix-contents.mjs', [], {
      VERILOGHDL_VSIX_LISTING_FILE: listingPath,
    });
    assert.notStrictEqual(missingResult.status, 0);
    assert.match(missingResult.stderr, /VSIX is missing/);
  });
});

function createBundleFixture(options?: {
  lock?: Partial<Record<string, unknown>>;
  metadata?: Partial<Record<string, unknown>>;
}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wasm-bundle-'));
  const wasmDir = path.join(root, 'resources', 'wasm');
  const lockPath = path.join(root, 'build', 'slang-server.lock.json');
  fs.mkdirSync(path.join(root, 'build'), { recursive: true });
  fs.mkdirSync(path.join(wasmDir, 'licenses'), { recursive: true });

  const wasmContent = Buffer.from('fake wasm');
  const wasmSha = createHash('sha256').update(wasmContent).digest('hex');
  fs.writeFileSync(path.join(wasmDir, 'slang-server.wasm'), wasmContent);
  fs.writeFileSync(path.join(wasmDir, 'licenses', 'slang-server.LICENSE'), 'license');
  fs.writeFileSync(path.join(wasmDir, 'licenses', 'slang.LICENSE'), 'license');
  fs.writeFileSync(path.join(wasmDir, 'licenses', 'THIRD_PARTY_NOTICES.md'), 'notices');

  const lock = {
    slangServerCommit: 'server-commit',
    slangCommit: 'slang-commit',
    wasiSdkVersion: '25.0',
    buildType: 'Release',
    wasmSizeLimitBytes: 100,
    ...options?.lock,
  };
  const metadata = {
    slangServerCommit: lock.slangServerCommit,
    slangCommit: lock.slangCommit,
    wasiSdkVersion: lock.wasiSdkVersion,
    buildType: lock.buildType,
    wasmSha256: wasmSha,
    wasmSizeBytes: wasmContent.length,
    ...options?.metadata,
  };

  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2));
  fs.writeFileSync(path.join(wasmDir, 'slang-server.meta.json'), JSON.stringify(metadata, null, 2));

  return { root, wasmDir, lockPath };
}

function runNodeScript(scriptPath: string, args: string[], env: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, [path.join(getRepositoryRoot(), scriptPath), ...args], {
    cwd: getRepositoryRoot(),
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
}
