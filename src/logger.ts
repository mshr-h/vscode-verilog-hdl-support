import * as vscode from 'vscode';

/* [WIP] Wrapper for vscode.LogOutputChannel.
Example usage:

let logger: Logger = createLogger("Verilog");
logger.info("Info message");
let child_logger = logger.child("ChildA");
child_logger.info("Message from child");
-> The output would be
Info message
[ChildA] Message from child"
*/

export class Logger {
  private name: string;
  private parentLogger: vscode.LogOutputChannel | Logger;

  constructor(name: string, parentLogger: vscode.LogOutputChannel | Logger) {
    this.name = name;
    this.parentLogger = parentLogger;
  }

  child(name: string) {
    return new Logger(name, this);
  }

  private log(level: keyof Logger, message: string, data?: unknown): void {
    let formattedMessage =
      this.parentLogger instanceof Logger ? `[${this.name}] ${message}` : `${message}`;
    if (data) {
      formattedMessage += JSON.stringify(data);
    }
    this.parentLogger[level](formattedMessage);
  }

  trace(message: string, data?: unknown) {
    this.log('trace', message, data);
  }

  info(message: string, data?: unknown) {
    this.log('info', message, data);
  }

  debug(message: string, data?: unknown) {
    this.log('debug', message, data);
  }

  warn(message: string, data?: unknown) {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown) {
    this.log('error', message, data);
  }
}

export function createLogger(name: string): Logger {
  return new Logger(name, vscode.window.createOutputChannel(name, { log: true }));
}
