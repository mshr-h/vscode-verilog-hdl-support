// import * as vscode from 'vscode';
import {HoverProvider, TextDocument, Position, CancellationToken, Hover, window, Range, MarkdownString} from 'vscode';
import {Ctags, CtagsManager, Symbol} from '../ctags';

export default class VerilogHoverProvider implements HoverProvider {
    // lang: verilog / systemverilog
    private lang: string;

    constructor(lang: string) {
        this.lang = lang;
    }

    public provideHover(document: TextDocument, position: Position, token: CancellationToken) : Hover {
        // get word start and end
        let textRange = document.getWordRangeAtPosition(position);
        if(textRange.isEmpty)
            return;
        // hover word
        let targetText = document.getText(textRange);
        let ctags : Ctags = CtagsManager.ctags;
        if (ctags.doc === undefined || ctags.doc.uri !== document.uri ) { // systemverilog keywords
            return;
        }
        else {
            // find symbol
            for(let i of ctags.symbols) {
                // returns the first found tag. Disregards others
                // TODO: very basic hover implementation. Can be extended
                if(i.name === targetText) {
                    let codeRange = new Range(i.startPosition, new Position (i.startPosition.line, Number.MAX_VALUE));
                    let code = document.getText(codeRange).trim();
                    let hoverText : MarkdownString = new MarkdownString();
                    hoverText.appendCodeblock(code, this.lang);
                    return new Hover(hoverText);
                }
            }
            return;
        }
    }
}

