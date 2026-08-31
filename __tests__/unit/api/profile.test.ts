import MockAdapter from 'axios-mock-adapter'
import { datingClient } from '../../../src/api/client'
import { createProfile, deleteMyAccountData, getMyProfile, updateMyProfile } from '../../../src/api/profile'

const mock = new MockAdapter(datingClient)

afterEach(() => mock.reset())

const MOCK_PROFILE = {
  userId: 'u1',
  tenantId: 'baat',
  email: 'a@b.com',
  name: 'Ali',
  age: 27,
  gender: 'man',
  seeking: 'women',
  borough: 'manhattan',
  bio: '',
  photos: [],
  tags: [],
  isActive: true,
  createdAt: '2026-06-11T00:00:00.000Z',
  updatedAt: '2026-06-11T00:00:00.000Z',
}

describe('profile API', () => {
  describe('createProfile', () => {
    it('posts the payload and returns the created profile', async () => {
      mock.onPost('/profile').reply(201, MOCK_PROFILE)
      const result = await createProfile({
        age: 27, gender: 'man', seeking: 'women', borough: 'manhattan',
      })
      expect(result.userId).toBe('u1')
      const body = JSON.parse(mock.history.post[0].data)
      expect(body).toEqual({ age: 27, gender: 'man', seeking: 'women', borough: 'manhattan' })
    })

    it('throws on validation failure (400)', async () => {
      mock.onPost('/profile').reply(400, { error: 'age must be at least 18' })
      await expect(
        createProfile({ age: 17, gender: 'man', seeking: 'women', borough: 'manhattan' }),
      ).rejects.toThrow()
    })
  })

  describe('getMyProfile', () => {
    it('returns the profile on 200', async () => {
      mock.onGet('/profile/me').reply(200, MOCK_PROFILE)
      const result = await getMyProfile()
      expect(result?.userId).toBe('u1')
    })

    it('returns null on 404 (no profile yet)', async () => {
      mock.onGet('/profile/me').reply(404, { error: 'Profile not found' })
      const result = await getMyProfile()
      expect(result).toBeNull()
    })

    it('throws on other errors', async () => {
      mock.onGet('/profile/me').reply(500)
      await expect(getMyProfile()).rejects.toThrow()
    })
  })

  describe('updateMyProfile', () => {
    it('PATCHes the given partial and returns the updated profile', async () => {
      mock.onPatch('/profile/me').reply(200, { ...MOCK_PROFILE, tags: ['coffee', 'hiking', 'movies'] })
      const result = await updateMyProfile({ tags: ['coffee', 'hiking', 'movies'] })
      expect(result.tags).toEqual(['coffee', 'hiking', 'movies'])
      const body = JSON.parse(mock.history.patch[0].data)
      expect(body).toEqual({ tags: ['coffee', 'hiking', 'movies'] })
    })

    it('PATCHes prompt answers wholesale (issue #13 wire contract)', async () => {
      const prompts = [{ promptId: 'fluent-in', answer: 'Urdu, and reading the room' }]
      mock.onPatch('/profile/me').reply(200, { ...MOCK_PROFILE, prompts })
      const result = await updateMyProfile({ prompts })
      expect(result.prompts).toEqual(prompts)
      expect(JSON.parse(mock.history.patch[0].data)).toEqual({ prompts })
    })

    it('throws on server error', async () => {
      mock.onPatch('/profile/me').reply(500)
      await expect(updateMyProfile({ tags: ['x'] })).rejects.toThrow()
    })

    // Cultural onboarding fields (issue #3). The service currently strips
    // unknown keys (UpdateProfileSchema is non-strict + validate() replaces
    // req.body), so the response legitimately may not echo them back — the
    // app must send them and tolerate their absence.
    describe('cultural fields', () => {
      it('PATCHes each cultural field with the expected payload shape', async () => {
        mock.onPatch('/profile/me').reply(200, MOCK_PROFILE)
        await updateMyProfile({ lookingFor: 'marriage' })
        await updateMyProfile({ languages: ['urdu', 'english'] })
        await updateMyProfile({ roots: ['punjab', 'diaspora-born'] })
        await updateMyProfile({ faith: 'islam' })
        await updateMyProfile({ familyInvolvement: 'when-serious' })

        const bodies = mock.history.patch.map((r) => JSON.parse(r.data))
        expect(bodies).toEqual([
          { lookingFor: 'marriage' },
          { languages: ['urdu', 'english'] },
          { roots: ['punjab', 'diaspora-born'] },
          { faith: 'islam' },
          { familyInvolvement: 'when-serious' },
        ])
      })

      it('tolerates the backend ignoring the fields (response without them)', async () => {
        // MOCK_PROFILE has no cultural fields — exactly what the service
        // returns today after stripping them.
        mock.onPatch('/profile/me').reply(200, MOCK_PROFILE)
        const result = await updateMyProfile({ languages: ['urdu'] })
        expect(result.userId).toBe('u1')
        expect(result.languages).toBeUndefined()
      })
    })
  })

  describe('deleteMyAccountData', () => {
    // Contract: the dating service DELETE /profile/me/account → 200 {ok:true} (issue #18).
    it('DELETEs /profile/me/account and resolves on 200', async () => {
      mock.onDelete('/profile/me/account').reply(200, { ok: true })
      await expect(deleteMyAccountData()).resolves.toBeUndefined()
      expect(mock.history.delete).toHaveLength(1)
      expect(mock.history.delete[0].url).toBe('/profile/me/account')
    })

    it('treats 404 as success (idempotent re-run after partial failure)', async () => {
      mock.onDelete('/profile/me/account').reply(404, { error: 'Not found' })
      await expect(deleteMyAccountData()).resolves.toBeUndefined()
    })

    it('throws on server error so the caller can offer retry', async () => {
      mock.onDelete('/profile/me/account').reply(500)
      await expect(deleteMyAccountData()).rejects.toThrow()
    })
  })
})
