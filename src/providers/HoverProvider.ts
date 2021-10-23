// import * as vscode from 'vscode';
import {
    HoverProvider,
    TextDocument,
    Position,
    CancellationToken,
    Hover,
    window,
    Range,
    MarkdownString,
    ProviderResult,
} from 'vscode';
import { BsvInfoProviderManger } from '../BsvProvider';
import { Ctags, CtagsManager, Symbol } from '../ctags';
import { Logger, Log_Severity } from '../Logger';

export class VerilogHoverProvider implements HoverProvider {
    // lang: verilog / systemverilog
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    public async provideHover(
        document: TextDocument,
        position: Position,
        token: CancellationToken
    ): Promise<Hover | undefined> {
        this.logger.log('Hover requested');
        // get word start and end
        let textRange = document.getWordRangeAtPosition(position);
        if (!textRange || textRange.isEmpty) return;
        // hover word
        let targetText = document.getText(textRange);
        let symbols: Symbol[] = await CtagsManager.getSymbols(document);
        // find symbol
        for (let i of symbols) {
            // returns the first found tag. Disregards others
            // TODO: very basic hover implementation. Can be extended
            if (i.name === targetText) {
                let codeRange = new Range(
                    i.startPosition,
                    new Position(i.startPosition.line, Number.MAX_VALUE)
                );
                let code = document.getText(codeRange).trim();
                let hoverText: MarkdownString = new MarkdownString();
                hoverText.appendCodeblock(code, document.languageId);
                this.logger.log('Hover object returned');
                return new Hover(hoverText);
            }
        }
        this.logger.log('Hover object not found', Log_Severity.Warn);
        return;
    }
}

export class BsvHoverProvider implements HoverProvider {
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    provideHover(
        document: TextDocument,
        position: Position,
        token: CancellationToken
    ): ProviderResult<Hover> {
        const provider = BsvInfoProviderManger.getInstance().getProvider();
        var hover = provider.getHover(document, position);
        return hover;
    }
}
