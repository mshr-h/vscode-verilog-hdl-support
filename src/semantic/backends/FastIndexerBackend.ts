// SPDX-License-Identifier: MIT
import * as fs from 'fs/promises';
import type { ProjectSnapshot } from '../../project/ProjectTypes';
import type { SymbolRecord } from '../SymbolRecords';
import { FastScanner } from './FastScanner';

export class FastIndexerBackend {
  constructor(private readonly scanner = new FastScanner()) {}

  async build(snapshot: ProjectSnapshot): Promise<SymbolRecord[]> {
    const symbols: SymbolRecord[] = [];
    for (const compileUnit of snapshot.compileUnits) {
      for (const file of compileUnit.files) {
        try {
          const text = await fs.readFile(file.uri.fsPath, 'utf8');
          symbols.push(...this.scanner.scan(text, file.uri, compileUnit.id).symbols);
        } catch {
          // Missing and unreadable files are already project diagnostics in the loader.
        }
      }
    }
    return symbols;
  }
}
