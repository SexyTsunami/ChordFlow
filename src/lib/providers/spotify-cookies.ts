/**
 * Cookie names for the optional Spotify user-authorisation flow.
 *
 * The access token is kept in an httpOnly, sameSite=lax cookie so it is
 * readable by the server during an import but never by client JavaScript.
 * It is not persisted anywhere else.
 */
export const SPOTIFY_TOKEN_COOKIE = "cf_spotify_at";
export const SPOTIFY_STATE_COOKIE = "cf_spotify_state";
