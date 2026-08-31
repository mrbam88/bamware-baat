import MockAdapter from 'axios-mock-adapter'
import { datingClient } from '../../../src/api/client'
import { fetchMatches, fetchMessages, sendMessage } from '../../../src/api/matches'

const mock = new MockAdapter(datingClient)

afterEach(() => mock.reset())

describe('matches API', () => {
  it('fetchMatches returns paginated match envelope', async () => {
    mock.onGet('/matches').reply(200, {
      matches: [{ matchId: 'm1', matchedUserId: 'u2', createdAt: '2026-01-01' }],
      nextCursor: 'cursor-abc',
    })
    const result = await fetchMatches()
    expect(result.matches[0].matchId).toBe('m1')
    expect(result.nextCursor).toBe('cursor-abc')
  })

  it('fetchMatches surfaces optional commonground when the API returns it', async () => {
    mock.onGet('/matches').reply(200, {
      matches: [
        { matchId: 'm1', matchedUserId: 'u2', createdAt: '2026-01-01', commonground: 'analog photography' },
        { matchId: 'm2', matchedUserId: 'u3', createdAt: '2026-01-02' },
      ],
    })
    const result = await fetchMatches()
    expect(result.matches[0].commonground).toBe('analog photography')
    expect(result.matches[1].commonground).toBeUndefined()
  })

  it('fetchMatches passes cursor param', async () => {
    mock.onGet('/matches').reply(200, { matches: [] })
    await fetchMatches('cursor-xyz')
    expect(mock.history.get[0].params).toEqual({ cursor: 'cursor-xyz' })
  })

  it('fetchMessages returns messages with nextCursor', async () => {
    mock.onGet('/matches/m1/messages').reply(200, {
      messages: [{ messageId: 'msg1', senderId: 'u1', content: 'hey', createdAt: '2026-01-01' }],
      nextCursor: 'cursor-abc',
    })
    const result = await fetchMessages('m1')
    expect(result.messages).toHaveLength(1)
    expect(result.nextCursor).toBe('cursor-abc')
  })

  it('fetchMessages passes cursor param', async () => {
    mock.onGet('/matches/m1/messages').reply(200, { messages: [] })
    await fetchMessages('m1', 'cursor-xyz')
    expect(mock.history.get[0].params).toEqual({ cursor: 'cursor-xyz' })
  })

  it('sendMessage returns created message', async () => {
    const msg = { messageId: 'msg2', senderId: 'u1', content: 'hello', createdAt: '2026-01-01' }
    mock.onPost('/matches/m1/messages').reply(201, msg)
    const result = await sendMessage('m1', 'hello')
    expect(result.content).toBe('hello')
  })
})
