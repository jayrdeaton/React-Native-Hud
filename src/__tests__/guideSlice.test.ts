import { createGuideSlice, createReturningPlayerMigrate } from '../guide/guideSlice'

const REHYDRATE = 'persist/REHYDRATE'

describe('createGuideSlice', () => {
  const slice = createGuideSlice({ currentVersion: 2 })

  it("is assignable to a redux reducer over UnknownAction (what configureStore's typing demands)", () => {
    // Compile-time assertion (ts-jest type-checks this file): a GuideAction that was an interface, not
    // a type alias, would fail here exactly as it failed a consuming app's typecheck.
    const asReduxReducer: (state: { versionSeen: number } | undefined, action: { type: string; [extra: string]: unknown }) => { versionSeen: number } = slice.reducer
    expect(asReduxReducer(undefined, { type: '@@INIT' })).toEqual({ versionSeen: 0 })
  })

  it('starts as never seen', () => {
    expect(slice.reducer(undefined, { type: '@@INIT' })).toEqual({ versionSeen: 0 })
  })

  it('leaves a fresh install unseen: REHYDRATE with no payload at all means nothing was persisted', () => {
    const state = slice.reducer(undefined, { type: REHYDRATE, key: 'root', payload: undefined })
    expect(state.versionSeen).toBe(0)
  })

  it('grandfathers an existing player: a payload with no guide key predates this slice', () => {
    const state = slice.reducer(undefined, { type: REHYDRATE, key: 'root', payload: { theme: {}, haptic: {}, _persist: { version: -1, rehydrated: true } } })
    expect(state.versionSeen).toBe(2)
  })

  it('restores whatever version was persisted', () => {
    expect(slice.reducer(undefined, { type: REHYDRATE, key: 'root', payload: { guide: { versionSeen: 1 } } }).versionSeen).toBe(1)
    expect(slice.reducer(undefined, { type: REHYDRATE, key: 'root', payload: { guide: { versionSeen: 0 } } }).versionSeen).toBe(0)
  })

  it('treats a malformed persisted entry like a missing one', () => {
    const state = slice.reducer(undefined, { type: REHYDRATE, key: 'root', payload: { guide: { versionSeen: 'nope' } } })
    expect(state.versionSeen).toBe(2)
  })

  it('ignores a REHYDRATE that belongs to a different persisted reducer', () => {
    const before = { versionSeen: 0 }
    const state = slice.reducer(before, { type: REHYDRATE, key: 'someNestedPersist', payload: { unrelated: true } })
    expect(state).toBe(before)
  })

  it('still handles a REHYDRATE that carries no key (nothing to filter on)', () => {
    const state = slice.reducer(undefined, { type: REHYDRATE, payload: { theme: {} } })
    expect(state.versionSeen).toBe(2)
  })

  it('markSeen records the version, and never lowers it', () => {
    let state = slice.reducer(undefined, slice.actions.markSeen(2))
    expect(state.versionSeen).toBe(2)
    state = slice.reducer(state, slice.actions.markSeen(1))
    expect(state.versionSeen).toBe(2)
  })

  it('reads its mount key and persist key from options', () => {
    const custom = createGuideSlice({ currentVersion: 3, mountKey: 'intro', persistKey: 'main' })

    expect(custom.actions.markSeen(3).type).toBe('intro/markSeen')
    expect(custom.reducer(undefined, { type: REHYDRATE, key: 'root', payload: { theme: {} } }).versionSeen).toBe(0)
    expect(custom.reducer(undefined, { type: REHYDRATE, key: 'main', payload: { theme: {} } }).versionSeen).toBe(3)
    expect(custom.reducer(undefined, { type: REHYDRATE, key: 'main', payload: { intro: { versionSeen: 1 } } }).versionSeen).toBe(1)
  })

  it('selectVersionSeen reads the slice off the root state, defaulting to 0', () => {
    expect(slice.selectVersionSeen({ guide: { versionSeen: 2 } })).toBe(2)
    expect(slice.selectVersionSeen({})).toBe(0)
    expect(createGuideSlice({ currentVersion: 1, mountKey: 'intro' }).selectVersionSeen({ intro: { versionSeen: 1 } })).toBe(1)
  })
})

describe('createReturningPlayerMigrate', () => {
  const slice = createGuideSlice({ currentVersion: 2 })

  function storageWith(stored: Record<string, string>) {
    return { getItem: jest.fn(async (key: string) => stored[key] ?? null) }
  }

  it('passes an existing root store through untouched, without reading storage', async () => {
    const storage = storageWith({ 'pong.settings': '{}' })
    const existing = { _persist: { version: -1, rehydrated: true } }

    await expect(createReturningPlayerMigrate(storage, ['pong.settings'])(existing, -1)).resolves.toBe(existing)
    expect(storage.getItem).not.toHaveBeenCalled()
  })

  it('leaves a true fresh install (no root store, no legacy keys) as nothing stored', async () => {
    await expect(createReturningPlayerMigrate(storageWith({}), ['pong.settings', 'pong.stats'])(undefined, -1)).resolves.toBeUndefined()
  })

  it('turns "no root store, but a key an earlier build wrote" into an empty payload the slice grandfathers', async () => {
    const migrated = await createReturningPlayerMigrate(storageWith({ 'pong.stats': '{"wins":3}' }), ['pong.settings', 'pong.stats'])(undefined, -1)

    expect(migrated).toEqual({ _persist: { version: -1, rehydrated: false } })
    // End to end with the slice: that payload is what an existing player's REHYDRATE looks like.
    expect(slice.reducer(undefined, { type: 'persist/REHYDRATE', key: 'root', payload: migrated }).versionSeen).toBe(2)
    // While a real fresh install still sees the guide.
    expect(slice.reducer(undefined, { type: 'persist/REHYDRATE', key: 'root', payload: undefined }).versionSeen).toBe(0)
  })

  it('falls back to fresh-install behavior when storage fails, and with no legacy keys at all', async () => {
    const failing = { getItem: jest.fn(async () => Promise.reject(new Error('disk'))) }

    await expect(createReturningPlayerMigrate(failing, ['pong.settings'])(undefined, -1)).resolves.toBeUndefined()
    await expect(createReturningPlayerMigrate(storageWith({}), [])(undefined, -1)).resolves.toBeUndefined()
  })
})
