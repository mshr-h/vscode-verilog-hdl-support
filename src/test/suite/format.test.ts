import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as proxyquire from 'proxyquire';

suite('Formatting Provider', () => {
  test('does not crash without workspace', () => {
    const tmp = path.join(os.tmpdir(), 'fmt.v');
    fs.writeFileSync(tmp, 'module m; endmodule');

    const vscodeStub = {
      workspace: {
        getConfiguration: () => ({ get: () => '/bin/true' }),
        workspaceFolders: undefined,
      },
      Range: class { constructor(public start: any, public end: any) {} },
      Position: class { constructor(public line: number, public char: number) {} },
      TextEdit: { replace: (_r: any, _t: any) => ({}) },
    };

    const providerModule = proxyquire('../../providers/FormatPrivider', {
      vscode: vscodeStub,
    });

    const Provider = providerModule.VerilogFormatProvider;
    const logger: any = {
      info: () => {},
      error: () => {},
      warn: () => {},
      debug: () => {},
    };
    logger.getChild = () => logger;
    const provider = new Provider(logger);
    const doc = {
      uri: { fsPath: tmp },
      getText: () => fs.readFileSync(tmp, 'utf8'),
      positionAt: (_o: number) => new vscodeStub.Position(0, 0),
      languageId: 'verilog',
    };

    assert.doesNotThrow(() => provider.provideDocumentFormattingEdits(doc as any, {} as any, {} as any));
  });
});
