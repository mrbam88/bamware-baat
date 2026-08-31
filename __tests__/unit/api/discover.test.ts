import MockAdapter from 'axios-mock-adapter'
import { datingClient } from '../../../src/api/client'
import { fetchDiscover, swipe } from '../../../src/api/discover'

const mock = new MockAdapter(datingClient)

afterEach(() => mock.reset())

const PROFILES = [
  { userId: 'u1', name: 'Priya', age: 28, gender: 'F', seeking: 'M', borough: 'Brooklyn', bio: 'hi', photos: [] },
]

describe('discover API', () => {
  it('fetchDiscover returns profiles', async () => {
    mock.onGet('/discover').reply(200, PROFILES)
    const result = await fetchDiscover(20)
    expect(result).toHaveLength(1)
    expect(result[0].userId).toBe('u1')
  })

  it('fetchDiscover surfaces optional matchScore and commonground when backend sends them', async () => {
    mock.onGet('/discover').reply(200, [
      { ...PROFILES[0], matchScore: 87, commonground: 'you share Urdu and a love of chai' },
    ])
    const result = await fetchDiscover(20)
    expect(result[0].matchScore).toBe(87)
    expect(result[0].commonground).toBe('you share Urdu and a love of chai')
  })

  it('fetchDiscover tolerates profiles without the new optional fields', async () => {
    mock.onGet('/discover').reply(200, PROFILES)
    const result = await fetchDiscover(20)
    expect(result[0].matchScore).toBeUndefined()
    expect(result[0].commonground).toBeUndefined()
    expect(result[0].tags).toBeUndefined()
    expect(result[0].prompts).toBeUndefined()
  })

  it('fetchDiscover surfaces tags and prompts when backend sends them (issue #12)', async () => {
    mock.onGet('/discover').reply(200, [
      {
        ...PROFILES[0],
        tags: ['foodie', 'plant parent'],
        prompts: [{ promptId: 'ideal-sunday', answer: 'Chai and cricket' }],
      },
    ])
    const result = await fetchDiscover(20)
    expect(result[0].tags).toEqual(['foodie', 'plant parent'])
    expect(result[0].prompts).toEqual([{ promptId: 'ideal-sunday', answer: 'Chai and cricket' }])
  })

  it('fetchDiscover passes limit param', async () => {
    mock.onGet('/discover').reply(200, [])
    await fetchDiscover(5)
    expect(mock.history.get[0].params).toEqual({ limit: 5 })
  })

  it('swipe like returns matched status', async () => {
    mock.onPost('/swipe').reply(200, { matched: true, matchId: 'm1' })
    const result = await swipe('u1', 'like')
    expect(result.matched).toBe(true)
    expect(result.matchId).toBe('m1')
  })

  it('swipe pass returns not matched', async () => {
    mock.onPost('/swipe').reply(200, { matched: false })
    const result = await swipe('u1', 'pass')
    expect(result.matched).toBe(false)
  })
})
