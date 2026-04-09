export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  scope: string;
  message: string;
  data?: unknown;
}

export interface LoggerTransport {
  log(level: LogLevel, entry: LogEntry): void;
}

class ConsoleTransport implements LoggerTransport {
  log(level: LogLevel, entry: LogEntry): void {
    const formatter = `[${level.toUpperCase()}][${entry.scope}] ${entry.message}`;

    if (level === 'error') {
      console.error(formatter, entry.data);
      return;
    }

    if (level === 'warn') {
      console.warn(formatter, entry.data);
      return;
    }

    console.log(formatter, entry.data);
  }
}

export class AppLogger {
  constructor(private readonly transports: LoggerTransport[]) {}

  debug(entry: LogEntry): void {
    if (__DEV__) {
      this.transports.forEach(transport => transport.log('debug', entry));
    }
  }

  info(entry: LogEntry): void {
    this.transports.forEach(transport => transport.log('info', entry));
  }

  warn(entry: LogEntry): void {
    this.transports.forEach(transport => transport.log('warn', entry));
  }

  error(entry: LogEntry): void {
    this.transports.forEach(transport => transport.log('error', entry));
  }
}

export const appLogger = new AppLogger([new ConsoleTransport()]);
