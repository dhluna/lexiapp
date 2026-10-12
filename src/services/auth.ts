import type { AuthError, Session, SupabaseClient } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email: string | null;
  provider: "google" | "email";
}

export interface AuthSnapshot {
  status: "loading" | "signed-out" | "signed-in";
  user: AuthUser | null;
}

export type AuthResult = { ok: true } | { ok: false; message: string; code?: string };
export type SignUpResult = AuthResult & { needsConfirmation?: boolean };

/** What the UI and SyncService need from authentication. Supabase today, any provider tomorrow. */
export interface AuthService {
  getSnapshot(): AuthSnapshot;
  subscribe(listener: () => void): () => void;
  /** Resolves once the initial session (including an OAuth/email code in the URL) is known. */
  ready(): Promise<AuthSnapshot>;
  signInWithGoogle(nextPath: string): Promise<AuthResult>;
  signInWithPassword(email: string, password: string): Promise<AuthResult>;
  signUp(email: string, password: string, nextPath: string): Promise<SignUpResult>;
  resendConfirmation(email: string): Promise<AuthResult>;
  sendPasswordReset(email: string): Promise<AuthResult>;
  updatePassword(password: string): Promise<AuthResult>;
  signOut(): Promise<AuthResult>;
  deleteAccount(): Promise<AuthResult>;
}

export const MIN_PASSWORD_LENGTH = 8;

const MESSAGES: Record<string, string> = {
  invalid_credentials: "El email o la contraseña no son correctos.",
  email_not_confirmed: "Confirma tu email con el enlace que te enviamos.",
  user_already_exists: "Ya hay una cuenta con este email. Inicia sesión.",
  email_exists: "Ya hay una cuenta con este email. Inicia sesión.",
  weak_password: `La contraseña necesita al menos ${MIN_PASSWORD_LENGTH} caracteres y no puede ser una contraseña conocida.`,
  same_password: "La nueva contraseña debe ser distinta de la anterior.",
  over_request_rate_limit: "Demasiados intentos. Espera un momento y vuelve a probar.",
  over_email_send_rate_limit: "Ya te enviamos un correo hace poco. Espera unos minutos antes de pedir otro.",
  email_address_invalid: "Ese email no es válido.",
  validation_failed: "Revisa el email y la contraseña.",
  signup_disabled: "Ahora mismo no se pueden crear cuentas nuevas.",
  provider_disabled: "Este método de inicio de sesión no está activado.",
  session_expired: "Tu sesión caducó. Vuelve a iniciar sesión.",
  session_not_found: "Tu sesión caducó. Vuelve a iniciar sesión.",
  otp_expired: "El enlace caducó o ya se usó. Pide uno nuevo.",
  flow_state_expired: "El enlace caducó. Vuelve a intentarlo.",
  bad_code_verifier: "Abre el enlace en el mismo navegador donde lo pediste.",
  network: "No hay conexión. Inténtalo cuando vuelvas a estar en línea.",
};

const GENERIC = "No se pudo completar la operación. Inténtalo de nuevo.";

/** Supabase error → message for the user, in Spanish, without blaming them. */
export function authErrorMessage(error: Pick<AuthError, "message"> & { code?: string; status?: number }): string {
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];
  if (/fetch|network/i.test(error.message) || error.status === 0) return MESSAGES.network;
  return GENERIC;
}

function fail(error: Pick<AuthError, "message"> & { code?: string; status?: number }): AuthResult {
  return { ok: false, message: authErrorMessage(error), code: error.code };
}

function toUser(session: Session | null): AuthUser | null {
  if (!session) return null;
  const provider = session.user.app_metadata?.provider === "google" ? "google" : "email";
  return { id: session.user.id, email: session.user.email ?? null, provider };
}

/** Only same-site paths: never redirect to another origin after signing in. */
export function safeNextPath(next: string | null | undefined, fallback = "/ajustes"): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}

export class SupabaseAuthService implements AuthService {
  private snapshot: AuthSnapshot = { status: "loading", user: null };
  private readonly listeners = new Set<() => void>();
  private readonly initial: Promise<AuthSnapshot>;

  constructor(
    private readonly client: SupabaseClient,
    private readonly origin: string = typeof window === "undefined" ? "" : window.location.origin,
  ) {
    client.auth.onAuthStateChange((_event, session) => {
      // Called synchronously by supabase-js: never await other auth calls in here.
      this.set(session);
    });
    this.initial = client.auth.getSession().then(({ data }) => {
      this.set(data.session);
      return this.snapshot;
    });
  }

  getSnapshot = (): AuthSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  ready(): Promise<AuthSnapshot> {
    return this.initial;
  }

  async signInWithGoogle(nextPath: string): Promise<AuthResult> {
    const { error } = await this.client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: this.callbackUrl(nextPath) },
    });
    return error ? fail(error) : { ok: true };
  }

  async signInWithPassword(email: string, password: string): Promise<AuthResult> {
    const { error } = await this.client.auth.signInWithPassword({ email: email.trim(), password });
    return error ? fail(error) : { ok: true };
  }

  async signUp(email: string, password: string, nextPath: string): Promise<SignUpResult> {
    if (password.length < MIN_PASSWORD_LENGTH) return fail({ message: "weak", code: "weak_password" });
    const { data, error } = await this.client.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: this.callbackUrl(nextPath) },
    });
    if (error) return fail(error);
    // With email confirmation on, Supabase hides existing accounts behind a user with no identities.
    if (data.user && data.user.identities?.length === 0) return fail({ message: "exists", code: "user_already_exists" });
    return { ok: true, needsConfirmation: !data.session };
  }

  async resendConfirmation(email: string): Promise<AuthResult> {
    const { error } = await this.client.auth.resend({ type: "signup", email: email.trim() });
    return error ? fail(error) : { ok: true };
  }

  async sendPasswordReset(email: string): Promise<AuthResult> {
    const { error } = await this.client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${this.origin}/restablecer-contrasena`,
    });
    return error ? fail(error) : { ok: true };
  }

  async updatePassword(password: string): Promise<AuthResult> {
    if (password.length < MIN_PASSWORD_LENGTH) return fail({ message: "weak", code: "weak_password" });
    const { error } = await this.client.auth.updateUser({ password });
    return error ? fail(error) : { ok: true };
  }

  async signOut(): Promise<AuthResult> {
    // Local scope: signs out this device only, even without a connection.
    const { error } = await this.client.auth.signOut({ scope: "local" });
    return error ? fail(error) : { ok: true };
  }

  async deleteAccount(): Promise<AuthResult> {
    const { error } = await this.client.rpc("delete_my_account");
    if (error) return fail(error);
    await this.client.auth.signOut({ scope: "local" });
    return { ok: true };
  }

  private callbackUrl(nextPath: string): string {
    return `${this.origin}/auth/callback?next=${encodeURIComponent(safeNextPath(nextPath))}`;
  }

  private set(session: Session | null): void {
    const user = toUser(session);
    const status = user ? "signed-in" : "signed-out";
    if (this.snapshot.status === status && this.snapshot.user?.id === user?.id) return;
    this.snapshot = { status, user };
    for (const listener of this.listeners) listener();
  }
}
