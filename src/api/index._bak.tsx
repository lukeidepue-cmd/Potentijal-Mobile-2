// src/api/index.ts

export type Profile = {
  id: string;
  email: string;
  displayName: string;
};

export interface ProfilesApi {
  _me: Profile;
  getMe(): Promise<Profile>;
  updateMe(patch: Partial<Profile>): Promise<Profile>;
}

/**
 * Simple in-memory dev profile API.
 * Swap this for your real Supabase-backed implementation later.
 */
export const profilesApi: ProfilesApi = {
  _me: { id: "dev_user", email: "dev@example.com", displayName: "Dev" },

  async getMe() {
    return this._me;
  },

  async updateMe(patch) {
    this._me = { ...this._me, ...patch };
    return this._me;
  },
};
  