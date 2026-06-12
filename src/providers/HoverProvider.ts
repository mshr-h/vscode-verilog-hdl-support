// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import type { HoverService } from '../hdl/HoverService';
import { getExtensionLogger } from '../logging';

export class VerilogHoverProvider implements vscode.HoverProvider {
  // lang: verilog / systemverilog
  private readonly logger = getExtensionLogger('Provider', 'Hover');
  constructor(private readonly hoverService: HoverService) {}

  public async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): Promise<vscode.Hover | undefined> {
    this.logger.info(`Hover requested for ${document.uri.toString()}`);
    const hover = await this.hoverService.provideHover(document, position);
    if (hover) {
      this.logger.info("Hover returned");
      return hover;
    }
    this.logger.warn("Hover not found");
    return undefined;
  }
}
