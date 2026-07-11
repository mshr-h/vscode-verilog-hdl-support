// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import which from 'which';

function requiredNativeTools(): Set<string> {
  return new Set(
    (process.env.VERILOGHDL_REQUIRED_NATIVE_TOOLS ?? '')
      .split(',')
      .map((tool) => tool.trim())
      .filter((tool) => tool.length > 0)
  );
}

export function requireNativeTool(context: Mocha.Context, executable: string): string {
  const executablePath = which.sync(executable, { nothrow: true });
  if (executablePath) {
    return executablePath;
  }

  assert.ok(
    !requiredNativeTools().has(executable),
    `Required native tool is not available on PATH: ${executable}`
  );
  context.skip();
}
