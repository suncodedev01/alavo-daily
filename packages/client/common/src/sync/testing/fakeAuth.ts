import type { GoogleAuth, GoogleSession } from '../../platform';

/** A Google sign-in the test controls: it can expire, be refused, and hands out numbered tokens. */
export class FakeGoogleAuth implements GoogleAuth {
  token: string | null;
  signInCalls = 0;
  signOutCalls = 0;
  refuseSignIn = false;
  private issued = 0;

  constructor(
    private readonly onNewToken: (token: string) => void,
    private readonly email: string | null = null,
  ) {
    this.token = null;
  }

  async signIn(): Promise<GoogleSession> {
    this.signInCalls += 1;
    if (this.refuseSignIn) throw new Error('popup_closed');
    this.issued += 1;
    this.token = `token-${this.issued + 100}`;
    this.onNewToken(this.token);
    return { email: this.email };
  }

  async session(): Promise<GoogleSession | null> {
    return this.token ? { email: this.email } : null;
  }

  async accessToken(): Promise<string | null> {
    return this.token;
  }

  async signOut(): Promise<void> {
    this.signOutCalls += 1;
    this.token = null;
  }

  expire(): void {
    this.token = null;
  }
}
