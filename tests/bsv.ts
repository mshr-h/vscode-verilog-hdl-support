import { ANTLRInputStream, CommonTokenStream } from 'antlr4ts';
import { bsvLexer } from "../src/bsvjs/bsvLexer"
import { bsvParser } from "../src/bsvjs/bsvParser"
import { bsvListener } from "../src/bsvjs/bsvListener"



const testFolder = 'syntaxes/bsc-lib';
import * as fs from 'fs';
import * as path from 'path';


fs.readdir(testFolder, (err, files) => {
    if(err)
        throw err;
        
    files.forEach(file => {
        console.log(file);
        var data = fs.readFileSync(path.join(testFolder, file));
        
        if (err)
            throw err;

     


        const chars = new ANTLRInputStream(data.toString());
        const lexer = new bsvLexer(chars);
        const tokens = new CommonTokenStream(lexer);
        const parser = new bsvParser(tokens);

        class MyBsvListener implements bsvListener {
    
        }
        
        class MyBsvErrorListener{
            syntaxError(recognizer, offendingSymbol, line, charPositionInLine, msg, e) {
                console.error(msg)
                debugger
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