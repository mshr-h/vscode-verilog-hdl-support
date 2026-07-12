#!/usr/bin/env node
// SPDX-License-Identifier: MIT
const fs = require('fs');
const path = require('path');

function option(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

async function main() {
  const args = process.argv.slice(2);
  const sourcePath = args.at(-1);
  const recordPath = option(args, '--fake-record');
  const recordDir = option(args, '--fake-record-dir');
  const counterPath = option(args, '--fake-counter');
  const startedPath = option(args, '--fake-started');
  let invocation = 1;

  if (counterPath) {
    invocation = fs.existsSync(counterPath)
      ? Number(fs.readFileSync(counterPath, 'utf8')) + 1
      : 1;
    fs.writeFileSync(counterPath, String(invocation));
  }

  fs.mkdirSync(path.join(process.cwd(), 'xsim.dir'));
  fs.writeFileSync(path.join(process.cwd(), 'xvlog.pb'), 'fake xvlog artifact');

  const resolvedRecordPath = recordPath
    ?? (recordDir ? path.join(recordDir, `${invocation}.json`) : undefined);
  if (resolvedRecordPath) {
    fs.writeFileSync(
      resolvedRecordPath,
      JSON.stringify({ cwd: process.cwd(), args, invocation })
    );
  }

  if (startedPath && invocation === 1) {
    fs.writeFileSync(startedPath, 'started');
  }
  if (option(args, '--fake-sequence') === 'cancel-first' && invocation === 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  if (option(args, '--fake-mode') === 'failure') {
    process.stderr.write('fake xvlog compiler failure\n');
    process.exitCode = 7;
    return;
  }

  const message = invocation === 1 && counterPath ? 'old syntax error' : 'new syntax error';
  process.stdout.write(
    `ERROR: [VRFC 10-123] ${message} [${sourcePath}:5]\n`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 99;
});
