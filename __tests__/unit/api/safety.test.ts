import MockAdapter from 'axios-mock-adapter'
import { datingClient } from '../../../src/api/client'
import { block, report, REPORT_REASONS, ReportReason } from '../../../src/api/safety'

const mock = new MockAdapter(datingClient)

afterEach(() => mock.reset())

describe('safety API', () => {
  it('block posts targetUserId to /blocks and returns the block envelope', async () => {
    mock.onPost('/blocks').reply(201, { targetUserId: 'u2', createdAt: '2026-07-22T00:00:00Z' })
    const result = await block('u2')
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ targetUserId: 'u2' })
    expect(result.targetUserId).toBe('u2')
    expect(result.createdAt).toBe('2026-07-22T00:00:00Z')
  })

  it('report posts targetUserId + reason to /reports and returns the report envelope', async () => {
    mock.onPost('/reports').reply(201, {
      reportId: 'r1',
      targetUserId: 'u2',
      reason: 'harassment',
      createdAt: '2026-07-22T00:00:00Z',
    })
    const result = await report('u2', 'harassment')
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ targetUserId: 'u2', reason: 'harassment' })
    expect(result.reportId).toBe('r1')
    expect(result.reason).toBe('harassment')
  })

  it('accepts every reason in the service enum', async () => {
    mock.onPost('/reports').reply((config) => {
      const body = JSON.parse(config.data)
      return [201, { reportId: 'r-x', targetUserId: body.targetUserId, reason: body.reason, createdAt: '2026-07-22' }]
    })
    for (const reason of REPORT_REASONS) {
      const result = await report('u9', reason)
      expect(result.reason).toBe(reason)
    }
    expect(mock.history.post).toHaveLength(REPORT_REASONS.length)
  })

  it('REPORT_REASONS exactly matches the service enum', () => {
    // Mirror of the dating service src/schemas/reportSchemas.ts — update both sides together.
    const serviceEnum: ReportReason[] = ['fake_profile', 'harassment', 'inappropriate_photos', 'other']
    expect([...REPORT_REASONS]).toEqual(serviceEnum)
  })

  it('block surfaces API errors', async () => {
    mock.onPost('/blocks').reply(400, { error: 'Cannot block yourself' })
    await expect(block('me')).rejects.toThrow()
  })

  it('report surfaces API errors', async () => {
    mock.onPost('/reports').reply(404, { error: 'Profile not found' })
    await expect(report('ghost', 'other')).rejects.toThrow()
  })
})
