import { Logger, ConsoleTransport, AuditService } from '../../src/lib/logging'

function makeLogger() {
  return new Logger({
    environment: 'test',
    platform: 'ios',
    appVersion: '1.0.0',
    minLevel: 'debug',
    sampleRate: 1,
    transports: [new ConsoleTransport()],
  })
}

describe('Logger', () => {
  it('initialises with a sessionId and requestId', () => {
    const logger = makeLogger()
    expect(typeof logger.sessionId).toBe('string')
    expect(logger.sessionId.length).toBeGreaterThan(0)
    expect(typeof logger.requestId).toBe('string')
    expect(logger.requestId.length).toBeGreaterThan(0)
  })

  it('setContext does not throw', () => {
    const logger = makeLogger()
    expect(() => logger.setContext({ userId: 'u1', tenantId: 't1' })).not.toThrow()
  })

  it('clearContext does not throw', () => {
    const logger = makeLogger()
    logger.setContext({ userId: 'u1' })
    expect(() => logger.clearContext()).not.toThrow()
  })

  it('newRequestId rotates the requestId', () => {
    const logger = makeLogger()
    const original = logger.requestId
    logger.newRequestId()
    expect(logger.requestId).not.toBe(original)
  })

  it('logs at all levels without throwing', () => {
    const logger = makeLogger()
    expect(() => logger.debug('d')).not.toThrow()
    expect(() => logger.info('i')).not.toThrow()
    expect(() => logger.warn('w')).not.toThrow()
    expect(() => logger.error('e')).not.toThrow()
  })
})

describe('AuditService', () => {
  let audit: AuditService

  beforeEach(() => {
    audit = new AuditService(makeLogger())
  })

  it.each([
    ['loginSuccess'],
    ['loginFailure'],
    ['logout'],
    ['unauthorizedAccess'],
    ['apiError'],
  ])('%s does not throw', (method) => {
    expect(() => (audit as any)[method]({ sessionId: 's', requestId: 'r' })).not.toThrow()
  })

  it('loginSuccess accepts empty meta', () => {
    expect(() => audit.loginSuccess()).not.toThrow()
  })
})
