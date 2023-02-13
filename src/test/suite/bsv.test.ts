// SPDX-License-Identifier: MIT
import { CharStreams, CommonTokenStream } from 'antlr4ts';
import { bsvLexer } from '../../bsvjs/syntaxes/bsvLexer';
import { bsvParser } from '../../bsvjs/syntaxes/bsvParser';
import { bsvListener } from '../../bsvjs/syntaxes/bsvListener';

const testFolder = 'syntaxes/bsc-lib';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    fs.readdir(testFolder, (err, files) => {
        if (err) {throw err;}

        files.forEach((file) => {
            console.log(file);
            var data: Buffer = fs.readFileSync(path.join(testFolder, file));

            if (err) {throw err;}

            const chars = CharStreams.fromString(data.toString());
            const lexer = new bsvLexer(chars);
            const tokens = new CommonTokenStream(lexer);
            const parser = new bsvParser(tokens);

            class MyBsvListener implements bsvListener {}

            class MyBsvErrorListener {
                syntaxError(
                    _recognizer,
                    _offendingSymbol,
                    _line,
                    _charPositionInLine,
                    msg,
                    _e
                ) {
                    console.error(msg);
                    debugger;
                }
            }
            var listener = new MyBsvListener();
            var errorListener = new MyBsvErrorListener();

            parser.addParseListener(listener);
            parser.removeErrorListeners();
            parser.addErrorListener(errorListener);
            const tree = parser.top();
        });
    });
}

main();
