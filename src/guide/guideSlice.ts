// redux-persist's own REHYDRATE action-type constant, inlined as a literal rather than taking a
// dependency on the package itself — same reasoning as @tastic/profile's createSeatColorsSlice, whose
// factory shape this follows: this file has no opinion on whether the consuming app uses
// redux-persist at all, and the string is a long-stable part of its public contract.
const REHYDRATE = 'persist/REHYDRATE'

export interface GuideState {
  // The highest guide version this player has finished or skipped — 0 means "never". Compared
  // against the app's own `currentVersion`, so bumping that later re-prompts everyone (only worth
  // doing for a genuine controls/rules change, not a copy tweak).
  versionSeen: number
}

// A `type` alias, not an `interface`, on purpose: redux's UnknownAction has a string index signature,
// and only an object-literal type alias (never an interface) is implicitly assignable to one — with an
// interface here `configureStore` rejects the reducer at the consuming app's own typecheck.
export type GuideAction = {
  type: string
  payload?: unknown
  // Present on redux-persist's own REHYDRATE action (the persistConfig `key` it belongs to).
  key?: string
}

export interface GuideSliceOptions {
  // What a player who has already seen (or been grandfathered past) the guide is stamped with.
  currentVersion: number
  // The key the reducer is mounted under in the app's own combineReducers({...}) — redux-persist's
  // REHYDRATE payload is keyed by it, and a reducer has no way to see its own mount key.
  mountKey?: string
  // The persistConfig `key` of the store this reducer lives in. A REHYDRATE for any OTHER persisted
  // reducer (a nested persistReducer) carries that reducer's own substate, which would otherwise
  // look exactly like "an existing player with no guide key".
  persistKey?: string
}

export interface GuideSlice {
  actions: { markSeen: (version: number) => { type: string; payload: number } }
  reducer: (state: GuideState | undefined, action: GuideAction) => GuideState
  selectVersionSeen: (rootState: object) => number
}

// The persisted "has this player seen the how-to-play flow" flag, as its own slice rather than a
// field on any app's settings blob — every fleet app already has a redux-persist root store behind a
// PersistGate, and a dedicated key survives 'Reset stats'/'Reset match settings' (neither touches
// Redux) without needing any of the four strict per-app settings validators to learn a new field.
//
// The one thing a plain settings field can't do, and the reason this is a factory instead of a
// createSettingsSlice call: tell a FRESH install from an EXISTING player who just updated. On a
// fresh install redux-persist's getStoredState finds nothing under the persistConfig key and
// REHYDRATE arrives with `payload === undefined`; an existing player has a payload object that
// simply predates this slice and so has no `[mountKey]` entry. The first shows the guide; the
// second is grandfathered — stamped as already having seen `currentVersion` — so nobody who has been
// playing gets a "how to play" screen after an over-the-air update. Both can still replay it from
// Settings.
//
// redux-persist's default stateReconciler (autoMergeLevel1) skips any substate a reducer already
// changed while handling REHYDRATE, so the value returned here for an existing player wins rather
// than being overwritten.
export function createGuideSlice({ currentVersion, mountKey = 'guide', persistKey = 'root' }: GuideSliceOptions): GuideSlice {
  const MARK_SEEN = `${mountKey}/markSeen`
  const initialState: GuideState = { versionSeen: 0 }

  function markSeen(version: number) {
    return { type: MARK_SEEN, payload: version }
  }

  function reducer(state: GuideState = initialState, action: GuideAction): GuideState {
    if (action.type === REHYDRATE) {
      if (action.key !== undefined && action.key !== persistKey) return state
      const payload = action.payload as Record<string, Partial<GuideState> | undefined> | undefined
      // Nothing persisted at all (fresh install) — or the read failed, which shows the guide once
      // more rather than silently skipping it.
      if (!payload) return state
      const persisted = payload[mountKey]
      if (typeof persisted?.versionSeen === 'number') return { versionSeen: persisted.versionSeen }
      return { versionSeen: currentVersion }
    }
    if (action.type === MARK_SEEN && typeof action.payload === 'number') {
      return { versionSeen: Math.max(state.versionSeen, action.payload) }
    }
    return state
  }

  function selectVersionSeen(rootState: object): number {
    return (rootState as Record<string, GuideState | undefined>)[mountKey]?.versionSeen ?? 0
  }

  return { actions: { markSeen }, reducer, selectVersionSeen }
}

// The one AsyncStorage call createReturningPlayerMigrate needs, passed in (apps pass AsyncStorage
// itself) so this entry point never imports it.
export interface GuideStorageReader {
  getItem: (key: string) => Promise<string | null>
}

// Structurally identical to redux-persist's own PersistedState, so the returned function drops straight
// into a persistConfig's `migrate` without this package depending on redux-persist.
export type GuidePersistedState = { _persist: { version: number; rehydrated: boolean } } | undefined

// For a persistConfig's `migrate`. createGuideSlice grandfathers a player by finding a persisted root
// store with no guide entry in it, which only works for a player whose last build already HAD that root
// store. Most of the fleet (LightCycles, AirHockey, BoxHockey, Pong) only got a redux-persist root store
// after its last shipped update, so their current players have no root store at all: on their first
// launch of a guide build REHYDRATE would arrive with no payload, exactly like a fresh install, and the
// guide would greet people who've been playing for weeks.
//
// Those earlier builds did write their own AsyncStorage keys (settings, stats, appearance, ...), which
// are passed in as `legacyKeys`. So: no root store, but any legacy key present, means "played an earlier
// build", and that player is rehydrated with an empty payload instead, which the guide slice reads as an
// existing player and stamps as seen. An empty payload is a no-op for every other slice (nothing to merge,
// and redux-persist's reconciler skips `_persist`). A root store that already exists passes through
// untouched, so this is a no-op for every launch after the first. A failed read falls back to the
// fresh-install behavior (the guide shows once), the same as the slice itself.
//
// Runs before REHYDRATE and before PersistGate lets anything render, so there's no race with Home's
// auto-show. List the keys the shipped builds actually wrote (read them from the last shipped commit, not
// today's source). The one thing to avoid is a key today's build writes BEFORE PersistGate opens: on a
// fresh install that would already exist by the time this runs, and the fresh install would be taken for
// a returning player.
export function createReturningPlayerMigrate(storage: GuideStorageReader, legacyKeys: readonly string[]) {
  return async (state: GuidePersistedState, version: number): Promise<GuidePersistedState> => {
    if (state !== undefined || legacyKeys.length === 0) return state
    try {
      const values = await Promise.all(legacyKeys.map((key) => storage.getItem(key)))
      return values.some((value) => value !== null) ? { _persist: { version, rehydrated: false } } : undefined
    } catch {
      return undefined
    }
  }
}
