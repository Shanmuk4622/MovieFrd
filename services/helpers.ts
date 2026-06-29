// Shared helpers for the Supabase data layer.

/** Consistent error logging with a scope label. */
export const logError = (scope: string, error: unknown): void => {
  console.error(`[${scope}]`, error);
};

/** PostgREST "no rows" code returned by `.single()` when nothing matches. */
export const NOT_FOUND = 'PGRST116';
