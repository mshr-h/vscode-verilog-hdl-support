import * as vscode from 'vscode';

export class Logger {
  readonly name: string;
  readonly parentLogger: vscode.LogOutputChannel | Logger;

  constructor(name: string, parentLogger: vscode.LogOutputChannel | Logger) {
    this.name = name;
    this.parentLogger = parentLogger;
  }

  child(name: string) {
    return new Logger(name, this);
  }

  info(message: string) {
    if (this.parentLogger instanceof Logger) {
      this.parentLogger.info('[' + this.name + '] ' + message);
    } else {
      this.parentLogger.info(message);
    }
  }

  debug(message: string) {
    if (this.parentLogger instanceof Logger) {
      this.parentLogger.debug('[' + this.name + '] ' + message);
    } else {
      this.parentLogger.debug(message);
    }
  }

  warn(message: string) {
    if (this.parentLogger instanceof Logger) {
      this.parentLogger.warn('[' + this.name + '] ' + message);
    } else {
      this.parentLogger.warn(message);
    }
  }

  error(message: string) {
    if (this.parentLogger instanceof Logger) {
      this.parentLogger.error('[' + this.name + '] ' + message);
    } else {
      this.parentLogger.error(message);
    }
  }
}

export function createLogger(name: string): Logger {
  return new Logger(name, vscode.window.createOutputChannel(name, { log: true }));
}
