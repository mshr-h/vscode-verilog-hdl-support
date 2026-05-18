// SPDX-License-Identifier: MIT
import * as vscode from 'vscode';
import { getExtensionLogger } from '../logging';

export interface LintRunHandle {
  sourceId: string;
  ownerUri: vscode.Uri;
  ownerKey: string;
  generation: number;
  cancellationToken: vscode.CancellationToken;
  isCancellationRequested: boolean;
  isCurrent(): boolean;
  cancel(): void;
}

class ActiveLintRun implements LintRunHandle {
  readonly ownerKey: string;
  readonly cancellationToken: vscode.CancellationToken;
  private readonly cancellationTokenSource = new vscode.CancellationTokenSource();

  constructor(
    readonly sourceId: string,
    readonly ownerUri: vscode.Uri,
    readonly generation: number,
    private readonly isCurrentGeneration: (handle: LintRunHandle) => boolean
  ) {
    this.ownerKey = ownerUri.toString();
    this.cancellationToken = this.cancellationTokenSource.token;
  }

  get isCancellationRequested(): boolean {
    return this.cancellationToken.isCancellationRequested;
  }

  isCurrent(): boolean {
    return !this.isCancellationRequested && this.isCurrentGeneration(this);
  }

  cancel(): void {
    this.cancellationTokenSource.cancel();
  }

  dispose(): void {
    this.cancellationTokenSource.dispose();
  }
}

export default class LintRunManager {
  private readonly activeRuns = new Map<string, ActiveLintRun>();
  private readonly generations = new Map<string, number>();
  private readonly logger = getExtensionLogger('Linter', 'RunManager');

  beginRun(sourceId: string, ownerUri: vscode.Uri): LintRunHandle {
    const ownerKey = ownerUri.toString();
    const runKey = this.makeRunKey(sourceId, ownerKey);
    const previousRun = this.activeRuns.get(runKey);
    if (previousRun) {
      previousRun.cancel();
      previousRun.dispose();
      this.logger.info("Previous lint run cancelled by newer generation", {
        sourceId,
        ownerUri: ownerKey,
        generation: previousRun.generation,
      });
    }

    const generation = (this.generations.get(runKey) ?? 0) + 1;
    this.generations.set(runKey, generation);
    const run = new ActiveLintRun(sourceId, ownerUri, generation, (handle) =>
      this.isCurrent(handle)
    );
    this.activeRuns.set(runKey, run);
    this.logger.info("Lint run started", { sourceId, ownerUri: ownerKey, generation });
    return run;
  }

  isCurrent(handle: LintRunHandle): boolean {
    if (handle.isCancellationRequested) {
      return false;
    }
    const activeRun = this.activeRuns.get(this.makeRunKey(handle.sourceId, handle.ownerKey));
    return activeRun?.generation === handle.generation;
  }

  finishRun(handle: LintRunHandle): void {
    const runKey = this.makeRunKey(handle.sourceId, handle.ownerKey);
    const activeRun = this.activeRuns.get(runKey);
    if (activeRun?.generation === handle.generation) {
      activeRun.dispose();
      this.activeRuns.delete(runKey);
      this.logger.info("Lint run finished", {
        sourceId: handle.sourceId,
        ownerUri: handle.ownerKey,
        generation: handle.generation,
      });
    }
  }

  cancelOwner(ownerUri: vscode.Uri): void {
    const ownerKey = ownerUri.toString();
    for (const [runKey, run] of this.activeRuns) {
      if (run.ownerKey !== ownerKey) {
        continue;
      }
      this.cancelAndRemove(runKey, run, "Lint run cancelled by owner");
    }
  }

  cancelSource(sourceId: string): void {
    for (const [runKey, run] of this.activeRuns) {
      if (run.sourceId !== sourceId) {
        continue;
      }
      this.cancelAndRemove(runKey, run, "Lint run cancelled by source");
    }
  }

  cancelAll(): void {
    for (const [runKey, run] of this.activeRuns) {
      this.cancelAndRemove(runKey, run, "Lint run cancelled by manager");
    }
  }

  private cancelAndRemove(runKey: string, run: ActiveLintRun, message: string): void {
    run.cancel();
    run.dispose();
    this.activeRuns.delete(runKey);
    this.logger.info(message, {
      sourceId: run.sourceId,
      ownerUri: run.ownerKey,
      generation: run.generation,
    });
  }

  private makeRunKey(sourceId: string, ownerKey: string): string {
    return `${sourceId}\0${ownerKey}`;
  }
}
