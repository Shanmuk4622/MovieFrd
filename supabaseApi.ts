// Barrel for the Supabase data layer.
//
// The implementation lives in domain modules under `services/`. This file
// preserves the historical `../supabaseApi` import path so call sites stay
// stable. Prefer importing from the specific service module in new code.

export * from './services/profiles';
export * from './services/movieLists';
export * from './services/reviews';
export * from './services/activity';
export * from './services/friends';
export * from './services/rooms';
export * from './services/directMessages';
export * from './services/anonymousChat';
