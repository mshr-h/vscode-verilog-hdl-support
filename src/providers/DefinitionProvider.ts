import {
    DefinitionProvider,
    TextDocument,
    CancellationToken,
    Position,
    ProviderResult,
    DefinitionLink,
    Range,
    Definition,
    LocationLink,
} from 'vscode';
import { BsvInfoProviderManger } from '../BsvProvider';
import { Ctags, CtagsManager, Symbol } from '../ctags';
import { Logger } from '../Logger';

export class VerilogDefinitionProvider implements DefinitionProvider {
    private logger: Logger;
    constructor(logger: Logger) {
        this.logger = logger;
    }

    async provideDefinition(
        document: TextDocument,
        position: Position,
        token: CancellationToken
    ): Promise<DefinitionLink[] | undefined> {
        this.logger.log('Definitions Requested: ' + document.uri);
        // get word start and end
        let textRange = document.getWordRangeAtPosition(position);
        if (!textRange || textRange.isEmpty) return;
        // hover word
        let targetText = document.getText(textRange);
        let symbols: Symbol[] = await CtagsManager.getSymbols(document);
        let matchingSymbols: Symbol[] = [];
        let definitions: DefinitionLink[] = [];
        // find all matching symbols
        for (let i of symbols) {
            if (i.name === targetText) {
                matchingSymbols.push(i);
            }
        }
        for (let i of matchingSymbols) {
            definitions.push({
                targetUri: document.uri,
                targetRange: new Range(
                    i.startPosition,
                    new Position(i.startPosition.line, Number.MAX_VALUE)
                ),
                targetSelectionRange: new Range(i.startPosition, i.endPosition),
            });
        }
        this.logger.log(definitions.length + ' definitions returned');
        return definitions;
    }
}

export class BsvDefinitionProvider implements DefinitionProvider {
    provideDefinition(
        document: TextDocument,
        position: Position,
        token: CancellationToken
    ): ProviderResult<LocationLink[] | Definition> {
        const provider = BsvInfoProviderManger.getInstance().getProvider();
        return provider.provideDefinition(document, position);
    }
}
