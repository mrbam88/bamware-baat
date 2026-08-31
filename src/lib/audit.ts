import { AuditService } from './logging'
import { logger } from './logger'

export const audit = new AuditService(logger)
