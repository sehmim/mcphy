/**
 * Simple console logger utility
 */

export enum LogLevel {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export class Logger {
  private static formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }

  static info(message: string): void {
    console.log(this.formatMessage(LogLevel.INFO, message));
  }

  static success(message: string): void {
    console.log(this.formatMessage(LogLevel.SUCCESS, message));
  }

  static warn(message: string): void {
    console.warn(this.formatMessage(LogLevel.WARN, message));
  }

  static error(message: string, error?: Error): void {
    console.error(this.formatMessage(LogLevel.ERROR, message));
    if (error && error.stack) {
      console.error(error.stack);
    }
  }
}
