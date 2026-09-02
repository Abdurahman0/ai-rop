/**
 * Lets the API client reach the auth store without importing it (the store
 * imports the client, so a direct dependency would be circular).
 */
type AuthBridge = {
  getAccessToken: () => string | null;
  refresh: () => Promise<string | null>;
  onUnauthorized: () => void;
  /** A 403 means the account belongs to no company: every endpoint will refuse. */
  onForbidden: (message: string) => void;
};

export const authBridge: AuthBridge = {
  getAccessToken: () => null,
  refresh: async () => null,
  onUnauthorized: () => undefined,
  onForbidden: () => undefined,
};

export function setAuthBridge(next: Partial<AuthBridge>) {
  Object.assign(authBridge, next);
}
