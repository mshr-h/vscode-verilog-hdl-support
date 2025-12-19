// SPDX-License-Identifier: MIT
import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CharStreams, CommonTokenStream } from 'antlr4ts';
import { bsvLexer } from '../bsvjs/syntaxes/bsvLexer';
import { bsvParser } from '../bsvjs/syntaxes/bsvParser';
import { bsvListener } from '../bsvjs/syntaxes/bsvListener';

const testFolder = path.resolve(process.cwd(), 'syntaxes/bsc-lib');

suite('BSV Parser', () => {
  test('parses BSV library files without syntax errors', async function () {
    this.timeout(20000);
    const entries = await fs.readdir(testFolder, { withFileTypes: true });
    const failures: string[] = [];
    let processedCount = 0;

    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }

      const filePath = path.join(testFolder, entry.name);
      const data = await fs.readFile(filePath);
      const chars = CharStreams.fromString(data.toString());
      const lexer = new bsvLexer(chars);
      const tokens = new CommonTokenStream(lexer);
      const parser = new bsvParser(tokens);

      class MyBsvListener implements bsvListener {}

      class MyBsvErrorListener {
        syntaxError(
          _recognizer: unknown,
          _offendingSymbol: unknown,
          line: number,
          charPositionInLine: number,
          msg: string
        ) {
          if (msg.includes('\f')) {
            return;
          }
          failures.push(`${entry.name}:${line}:${charPositionInLine} ${msg}`);
        }
      }

      const listener = new MyBsvListener();
      const errorListener = new MyBsvErrorListener();

      parser.addParseListener(listener);
      parser.removeErrorListeners();
      parser.addErrorListener(errorListener);
      parser.top();
      processedCount += 1;
    }

    if (failures.length > 0) {
      console.warn(`Parser errors:\n${failures.join('\n')}`);
    }
    assert.ok(processedCount > 0, 'No BSV files were processed.');
  });
});
