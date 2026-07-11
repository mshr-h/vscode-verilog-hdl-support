// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as path from 'path';
import { convertFromWslPath, convertToWslPath } from '../../../tools/WslPathConverter';

suite('[windows-wsl2] WslPathConverter integration', () => {
  test('round-trips a Windows path through real wslpath', async function () {
    this.timeout(15000);

    if (process.platform !== 'win32' || process.env.VERILOGHDL_RUN_WSL2_TESTS !== '1') {
      this.skip();
      return;
    }

    const windowsPath = __filename;
    const wslPath = await convertToWslPath(windowsPath, { timeoutMs: 15000 });
    assert.match(wslPath, /^\/mnt\/[a-z]\//i);

    const roundTrip = await convertFromWslPath(wslPath, { timeoutMs: 15000 });
    assert.strictEqual(
      path.normalize(roundTrip).toLowerCase(),
      path.normalize(windowsPath).toLowerCase()
    );
  });
});
