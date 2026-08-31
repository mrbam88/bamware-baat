import { Platform } from 'react-native'
import tenant from '../config/app.config'
import {
  Logger,
  ConsoleTransport,
  SentryTransport,
  BatchingTransport,
  CloudWatchTransport,
  type Transport,
} from './logging'

function buildTransports(): Transport[] {
  if (__DEV__) return [new ConsoleTransport()]

  const transports: Transport[] = [new SentryTransport()]

  const cwEndpoint = process.env.EXPO_PUBLIC_CLOUDWATCH_ENDPOINT
  if (cwEndpoint) {
    transports.push(
      new BatchingTransport(
        new CloudWatchTransport({
          endpoint: cwEndpoint,
          logGroupName: process.env.EXPO_PUBLIC_CLOUDWATCH_LOG_GROUP ?? `/${tenant.tenantId}`,
          logStreamName: process.env.EXPO_PUBLIC_CLOUDWATCH_LOG_STREAM ?? 'mobile',
          apiKey: process.env.EXPO_PUBLIC_CLOUDWATCH_API_KEY,
        }),
        { maxBatchSize: 50, flushIntervalMs: 5000 },
      ),
    )
  }

  return transports
}

export const logger = new Logger({
  environment: __DEV__ ? 'dev' : 'prod',
  platform: Platform.OS as 'ios' | 'android',
  appVersion: '1.0.0',
  minLevel: __DEV__ ? 'debug' : 'info',
  sampleRate: 1,
  transports: buildTransports(),
})
