import { MIN_PASSWORD_LENGTH, safeNextPath, type AuthResult } from "@lexi/core/services/auth";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Eye, EyeOff, Mail } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, TextInput, View, type TextInputProps } from "react-native";
import { AppText, Button, Card, Notice, Screen } from "@/components/ui";
import { useAuth } from "@/hooks/use-account";
import { FONTS, RADIUS, useTheme } from "@/theme";

type Mode = "signin" | "signup" | "reset";

function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="subheading">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors["ink-soft"]}
        {...props}
        style={[
          {
            minHeight: 52,
            paddingHorizontal: 14,
            borderRadius: RADIUS.md,
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.surface,
            color: colors.ink,
            fontFamily: FONTS.body,
            fontSize: 17,
          },
          props.style,
        ]}
      />
    </View>
  );
}

export function SignInScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string }>();
  const next = safeNextPath(params.next);
  const { available, snapshot, service } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [notice, setNotice] = useState<"confirm" | "reset-sent" | null>(null);

  if (!available || !service) {
    return (
      <Screen>
        <Card>
          <AppText variant="heading">Las cuentas no están activadas</AppText>
          <AppText variant="muted">Puedes seguir usando Lexi sin cuenta: tu progreso se guarda en este dispositivo.</AppText>
        </Card>
      </Screen>
    );
  }

  if (snapshot?.status === "signed-in") {
    return (
      <Screen>
        <Card>
          <AppText variant="heading">Ya has iniciado sesión</AppText>
          <AppText variant="muted">{snapshot.user?.email}</AppText>
          <Button title="Continuar" onPress={() => router.replace(next as never)} />
        </Card>
      </Screen>
    );
  }

  const handle = async (action: () => Promise<AuthResult>, onOk: () => void) => {
    setPending(true);
    setError(null);
    const result = await action();
    setPending(false);
    if (result.ok) onOk();
    else if (result.code !== "cancelled") setError({ message: result.message, code: result.code });
  };

  const switchMode = (value: Mode) => {
    setMode(value);
    setError(null);
    setNotice(null);
  };

  const submit = () => {
    if (mode === "signin") void handle(() => service.signInWithPassword(email, password), () => router.replace(next as never));
    else if (mode === "signup")
      void handle(
        async () => {
          const result = await service.signUp(email, password, next);
          if (result.ok && result.needsConfirmation) setNotice("confirm");
          else if (result.ok) router.replace(next as never);
          return result;
        },
        () => {},
      );
    else void handle(() => service.sendPasswordReset(email), () => setNotice("reset-sent"));
  };

  if (notice) {
    return (
      <Screen>
        <Card>
          <Mail size={28} color={colors.accent} />
          <AppText variant="heading">Revisa tu correo</AppText>
          <AppText variant="muted">
            {notice === "confirm"
              ? `Te enviamos un enlace a ${email} para confirmar tu cuenta. Ábrelo en este móvil: volverás a Lexi con la sesión iniciada.`
              : `Si hay una cuenta con ${email}, recibirás un enlace para elegir una contraseña nueva. Ábrelo en este móvil.`}
          </AppText>
          {notice === "confirm" && (
            <Button
              title="Reenviar el correo"
              variant="secondary"
              disabled={pending}
              onPress={() => void handle(() => service.resendConfirmation(email), () => {})}
            />
          )}
          <Button title="Volver a iniciar sesión" variant="ghost" onPress={() => switchMode("signin")} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="muted">
        {mode === "reset"
          ? "Te enviaremos un enlace para elegir una contraseña nueva."
          : "Guarda tu progreso y úsalo en todos tus dispositivos, también en la web."}
      </AppText>
      <Card>
        {mode !== "reset" && (
          <>
            <Button
              title="Continuar con Google"
              variant="secondary"
              disabled={pending}
              onPress={() => void handle(() => service.signInWithGoogle(next), () => router.replace(next as never))}
            />
            <AppText variant="small" style={{ textAlign: "center" }}>
              o con tu email
            </AppText>
            <View
              accessibilityRole="tablist"
              style={{ flexDirection: "row", gap: 4, padding: 4, borderRadius: RADIUS.md, backgroundColor: colors["surface-sunken"] }}
            >
              {(
                [
                  ["signin", "Iniciar sesión"],
                  ["signup", "Crear cuenta"],
                ] as const
              ).map(([value, label]) => (
                <Pressable
                  key={value}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: mode === value }}
                  onPress={() => switchMode(value)}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    borderRadius: RADIUS.sm,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: mode === value ? colors.surface : "transparent",
                  }}
                >
                  <AppText variant="label" color={mode === value ? colors.ink : colors["ink-soft"]}>
                    {label}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
        {mode !== "reset" && (
          <View style={{ gap: 4 }}>
            <View>
              <Field
                label="Contraseña"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                textContentType={mode === "signup" ? "newPassword" : "password"}
                accessibilityHint={mode === "signup" ? `Al menos ${MIN_PASSWORD_LENGTH} caracteres.` : undefined}
                style={{ paddingRight: 52 }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                onPress={() => setShowPassword((v) => !v)}
                style={{ position: "absolute", right: 4, bottom: 4, width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
              >
                {showPassword ? <EyeOff size={20} color={colors["ink-soft"]} /> : <Eye size={20} color={colors["ink-soft"]} />}
              </Pressable>
            </View>
            {mode === "signup" && <AppText variant="small">Al menos {MIN_PASSWORD_LENGTH} caracteres.</AppText>}
          </View>
        )}

        {error && (
          <Notice title={error.message} tone="danger">
            {error.code === "email_not_confirmed" ? (
              <Button
                title="Reenviar el correo de confirmación"
                variant="secondary"
                onPress={() => void handle(() => service.resendConfirmation(email), () => setNotice("confirm"))}
              />
            ) : undefined}
          </Notice>
        )}

        {pending ? (
          <ActivityIndicator color={colors.accent} accessibilityLabel="Un momento…" />
        ) : (
          <Button
            title={mode === "signin" ? "Iniciar sesión" : mode === "signup" ? "Crear cuenta" : "Enviar enlace"}
            onPress={submit}
          />
        )}
        <Button
          title={mode === "reset" ? "Volver a iniciar sesión" : "¿Olvidaste tu contraseña?"}
          variant="ghost"
          onPress={() => switchMode(mode === "reset" ? "signin" : "reset")}
        />
      </Card>
    </Screen>
  );
}

/** Landing route for `lexi://auth/callback`: finishes the sign-in from an email link. */
export function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; error_description?: string; error?: string; next?: string }>();
  const { service, snapshot } = useAuth();
  const [failed, setFailed] = useState<string | null>(null);
  const started = useRef(false);
  const next = safeNextPath(params.next);

  useEffect(() => {
    if (!service || started.current) return;
    started.current = true;
    // Google may already have finished in the system browser; the app then lands here too.
    if (service.getSnapshot().status === "signed-in") {
      router.replace(next as never);
      return;
    }
    const query = Object.entries(params)
      .filter(([, v]) => typeof v === "string")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`)
      .join("&");
    void service.completeRedirect(`lexi://auth/callback?${query}`).then((result) => {
      if (result.ok || service.getSnapshot().status === "signed-in") router.replace(next as never);
      else setFailed(result.message);
    });
  }, [service, params, router, next]);

  if (failed || !service) {
    return (
      <Screen>
        <Card>
          <AppText variant="heading">No se pudo iniciar sesión</AppText>
          <AppText variant="muted">{failed ?? "Las cuentas no están activadas."}</AppText>
          <Button title="Volver a entrar" onPress={() => router.replace("/entrar")} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <ActivityIndicator accessibilityLabel="Iniciando sesión" />
        <AppText variant="muted" style={{ textAlign: "center" }}>
          {snapshot?.status === "signed-in" ? "Sesión iniciada." : "Iniciando sesión…"}
        </AppText>
      </Card>
    </Screen>
  );
}

/** Opened from the password-reset email (`lexi://restablecer?code=…`). */
export function ResetPasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const { service, snapshot } = useAuth();
  const [exchanging, setExchanging] = useState(Boolean(params.code));
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!service || !params.code || started.current) return;
    started.current = true;
    void service.completeRedirect(`lexi://restablecer?code=${encodeURIComponent(params.code)}`).then((result) => {
      if (!result.ok) setError(result.message);
      setExchanging(false);
    });
  }, [service, params.code]);

  if (exchanging) {
    return (
      <Screen>
        <ActivityIndicator color={colors.accent} accessibilityLabel="Comprobando el enlace" />
      </Screen>
    );
  }

  if (done) {
    return (
      <Screen>
        <Card>
          <AppText variant="heading">Contraseña actualizada</AppText>
          <AppText variant="muted">Ya puedes usarla para entrar en todos tus dispositivos.</AppText>
          <Button title="Ir a Ajustes" onPress={() => router.replace("/ajustes")} />
        </Card>
      </Screen>
    );
  }

  if (!service || snapshot?.status !== "signed-in") {
    return (
      <Screen>
        <Card>
          <AppText variant="heading">El enlace caducó o no es válido</AppText>
          <AppText variant="muted">{error ?? "Pide un enlace nuevo para restablecer tu contraseña."}</AppText>
          <Button title="Pedir otro enlace" onPress={() => router.replace("/entrar")} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <Field
          label="Contraseña nueva"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          accessibilityHint={`Al menos ${MIN_PASSWORD_LENGTH} caracteres.`}
        />
        <Field
          label="Repite la contraseña"
          value={repeat}
          onChangeText={setRepeat}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />
        {error && <Notice title={error} tone="danger" />}
        <Button
          title="Guardar contraseña"
          onPress={async () => {
            if (password !== repeat) return setError("Las dos contraseñas no coinciden.");
            setError(null);
            const result = await service.updatePassword(password);
            if (result.ok) setDone(true);
            else setError(result.message);
          }}
        />
      </Card>
    </Screen>
  );
}
