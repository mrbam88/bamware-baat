/**
 * App-owned logging + audit primitives.
 *
 * Folded in from the vendored `@bamware/client-core` stub when the package
 * was retired (docs/adr/0001-retire-client-core.md, issue #6). Behavior is
 * intentionally identical to the stub it replaces.
 *
 * KNOWN GAP (pre-existing, inherited from the stub): the remote transports
 * (Sentry, CloudWatch, Datadog) are no-ops — production builds emit no
 * remote logs. Tracked as a follow-up issue; wiring them up is a behavior
 * change and out of scope for the ADR-0001 refactor.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: number
  [key: string]: any
}

export interface Transport {
  log(entry: LogEntry): void
}

export interface LoggerConfig {
  environment: string
  platform: string
  appVersion: string
  minLevel: LogLevel
  sampleRate: number
  transports: Transport[]
}

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

export class ConsoleTransport implements Transport {
  log(entry: LogEntry) {
    const fn = console[entry.level] ?? console.log
    fn(`[${entry.level.toUpperCase()}] ${entry.message}`)
  }
}

export class DatadogTransport implements Transport {
  constructor(_config: {
    apiKey: string
    service: string
    site: string
    source: string
  }) {}
  log(_entry: LogEntry) {}
}

export class CloudWatchTransport implements Transport {
  constructor(_config: {
    endpoint: string
    logGroupName: string
    logStreamName: string
    apiKey?: string
  }) {}
  log(_entry: LogEntry) {}
}

export class BatchingTransport implements Transport {
  constructor(private inner: Transport, _opts?: { maxBatchSize?: number; flushIntervalMs?: number }) {}
  log(entry: LogEntry) { this.inner.log(entry) }
}

export class SentryTransport implements Transport {
  constructor(_config: { environment?: string } = {}) {}
  log(_entry: LogEntry) {}
}

export class Logger {
  private minLevel: number
  private transports: Transport[]
  private context: Record<string, any> = {}
  sessionId: string = Math.random().toString(36).slice(2)
  requestId: string = Math.random().toString(36).slice(2)

  constructor(private config: LoggerConfig) {
    this.minLevel = LEVELS[config.minLevel] ?? 0
    this.transports = config.transports
  }

  private emit(level: LogLevel, message: string, meta?: Record<string, any>) {
    if (LEVELS[level] < this.minLevel) return
    const entry: LogEntry = { level, message, timestamp: Date.now(), ...this.context, ...meta }
    this.transports.forEach(t => t.log(entry))
  }

  debug(message: string, meta?: Record<string, any>) { this.emit('debug', message, meta) }
  info(message: string, meta?: Record<string, any>) { this.emit('info', message, meta) }
  warn(message: string, meta?: Record<string, any>) { this.emit('warn', message, meta) }
  error(message: string, meta?: Record<string, any>) { this.emit('error', message, meta) }

  setContext(ctx: Record<string, any>) { this.context = { ...this.context, ...ctx } }
  clearContext() { this.context = {} }
  newRequestId() { this.requestId = Math.random().toString(36).slice(2) }
}

export class AuditService {
  constructor(private logger: Logger) {}

  log(action: string, meta?: Record<string, any>) {
    this.logger.info(`[AUDIT] ${action}`, meta)
  }

  loginSuccess(meta?: Record<string, any>) { this.log('login_success', meta) }
  loginFailure(meta?: Record<string, any>) { this.log('login_failure', meta) }
  registerSuccess(meta?: Record<string, any>) { this.log('register_success', meta) }
  registerFailure(meta?: Record<string, any>) { this.log('register_failure', meta) }
  logout(meta?: Record<string, any>) { this.log('logout', meta) }
  sessionExpired(meta?: Record<string, any>) { this.log('session_expired', meta) }
  unauthorizedAccess(meta?: Record<string, any>) { this.log('unauthorized_access', meta) }
  apiError(meta?: Record<string, any>) { this.log('api_error', meta) }
}
