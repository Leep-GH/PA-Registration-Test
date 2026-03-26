/**
 * Structured logger wrapper. Uses console methods under the hood.
 * In production, integrate with your observability platform (e.g. NewRelic, Datadog).
 * Never pass PII (emails, names, tokens) to any logger method.
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

function emit(level: LogLevel, msg: string, ...args: unknown[]): void {
  const timestamp = new Date().toISOString();
  const line = `[${level}] ${timestamp} ${msg}`;
  switch (level) {
    case 'ERROR':
      args.length > 0 ? console.error(line, ...args) : console.error(line);
      break;
    case 'WARN':
      args.length > 0 ? console.warn(line, ...args) : console.warn(line);
      break;
    default:
      args.length > 0 ? console.log(line, ...args) : console.log(line);
  }
}

export const logger = {
  info: (msg: string, ...args: unknown[]) => emit('INFO', msg, ...args),
  warn: (msg: string, ...args: unknown[]) => emit('WARN', msg, ...args),
  error: (msg: string, ...args: unknown[]) => emit('ERROR', msg, ...args),
  debug: (msg: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      emit('DEBUG', msg, ...args);
    }
  },
};
