import { REMINDER_HOURS } from "@lexi/core/domain/reminder";
import { formatAgo } from "@lexi/core/domain/relative-time";
import { useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { Linking, Switch, View } from "react-native";
import { VoiceNotice } from "@/components/voice-notice";
import { AppText, Button, Card, Chip, Notice, Screen } from "@/components/ui";
import { useAuth, useSync } from "@/hooks/use-account";
import { useProgress, useProgressActions } from "@/hooks/use-progress";
import { useCelebrationSound } from "@/hooks/use-celebration";
import { useReminder } from "@/hooks/use-reminder";
import { PRIVACY_URL } from "@/legal";
import { useTheme } from "@/theme";

const SESSION_SIZES = [5, 10, 15, 20];
const RATES = [
  { value: 0.8, label: "Lenta" },
  { value: 1, label: "Normal" },
  { value: 1.2, label: "Rápida" },
];

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <AppText variant="heading" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </Card>
  );
}

function Choices<T extends number>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <AppText variant="subheading">{legend}</AppText>
      <View accessibilityRole="radiogroup" accessibilityLabel={legend} style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((o) => (
          <Chip key={o.value} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} />
        ))}
      </View>
    </View>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1 }}>
        <AppText variant="subheading">{label}</AppText>
        <AppText variant="small">{hint}</AppText>
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.accent, false: colors.line }}
      />
    </View>
  );
}

function AccountGroup() {
  const { colors } = useTheme();
  const router = useRouter();
  const { available, snapshot } = useAuth();
  const sync = useSync();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  if (!available) return null;

  const run = async (action: () => Promise<{ ok: boolean; message?: string }>, done: string) => {
    setBusy(true);
    setMessage(null);
    const result = await action();
    setBusy(false);
    setConfirmDelete(false);
    setMessage(result.ok ? { tone: "ok", text: done } : { tone: "error", text: result.message ?? "Inténtalo de nuevo." });
  };

  const user = snapshot?.status === "signed-in" ? snapshot.user : null;
  const s = sync.snapshot;
  const syncLine =
    !s || s.status === "disabled"
      ? null
      : s.status === "syncing"
        ? "Sincronizando…"
        : s.status === "offline"
          ? "Sin conexión: se sincronizará al volver."
          : s.status === "error"
            ? (s.error ?? "No se pudo sincronizar.")
            : s.lastSyncedAt
              ? `Sincronizado ${formatAgo(s.lastSyncedAt, new Date())}.`
              : "Preparando la sincronización…";

  return (
    <Group title="Cuenta">
      {!user ? (
        <>
          <AppText variant="muted">Guarda tu progreso y úsalo en todos tus dispositivos, también en la web.</AppText>
          <Button title="Iniciar sesión" onPress={() => router.push("/entrar")} />
        </>
      ) : (
        <>
          <View>
            <AppText variant="subheading">{user.email ?? "Cuenta sin email"}</AppText>
            <AppText variant="small">{user.provider === "google" ? "Con tu cuenta de Google" : "Con email y contraseña"}</AppText>
          </View>
          {syncLine && (
            <AppText
              variant="small"
              accessibilityLiveRegion="polite"
              color={s?.status === "error" ? colors.danger : s?.status === "idle" ? colors.learned : colors["ink-soft"]}
            >
              {syncLine}
            </AppText>
          )}
          <Button
            title="Sincronizar ahora"
            variant="secondary"
            disabled={busy || s?.status === "syncing"}
            onPress={() => void sync.service?.syncNow()}
          />
          <Button
            title="Cerrar sesión"
            variant="ghost"
            disabled={busy}
            onPress={() => void run(() => sync.service!.signOut(), "Sesión cerrada. Tu progreso sigue guardado en tu cuenta.")}
          />
          {confirmDelete ? (
            <Notice title="Se borrarán tu cuenta y todo tu progreso guardado en ella. No se puede deshacer." tone="danger">
              <View style={{ gap: 8, marginTop: 8 }}>
                <Button
                  title="Eliminar mi cuenta y todo mi progreso"
                  variant="danger"
                  disabled={busy}
                  onPress={() => void run(() => sync.service!.deleteAccount(), "Cuenta eliminada.")}
                />
                <Button title="Cancelar" variant="secondary" onPress={() => setConfirmDelete(false)} />
              </View>
            </Notice>
          ) : (
            <Button title="Eliminar cuenta" variant="ghost" onPress={() => setConfirmDelete(true)} />
          )}
        </>
      )}
      {message && (
        <AppText variant="subheading" accessibilityLiveRegion="polite" color={message.tone === "ok" ? colors.learned : colors.danger}>
          {message.text}
        </AppText>
      )}
    </Group>
  );
}

function ReminderGroup() {
  const { colors } = useTheme();
  const { settings, service } = useReminder();
  const [denied, setDenied] = useState(false);

  if (!service.available) {
    return (
      <Group title="Recordatorio">
        <Notice title="El recordatorio no está disponible en Expo Go">
          <AppText variant="small" color={colors.review}>
            Expo Go para Android no permite notificaciones. Funcionará en la app instalada (APK).
          </AppText>
        </Notice>
      </Group>
    );
  }

  return (
    <Group title="Recordatorio">
      <Toggle
        label="Recordatorio diario"
        hint="Un aviso al día para no perder la racha. No llega si ese día ya practicaste."
        value={settings.enabled}
        onChange={async (on) => {
          setDenied(false);
          if (!on) return service.disable();
          const result = await service.enable();
          setDenied(result === "denied");
        }}
      />
      {settings.enabled && (
        <Choices
          legend="Hora"
          options={REMINDER_HOURS.map((h) => ({ value: h, label: `${h}:00` }))}
          value={settings.hour}
          onChange={(hour) => void service.setHour(hour)}
        />
      )}
      {denied && (
        <Notice title="Las notificaciones están desactivadas para Lexi">
          <View style={{ gap: 8 }}>
            <AppText variant="small" color={colors.review}>
              Actívalas en los ajustes del sistema y vuelve a encender el recordatorio.
            </AppText>
            <Button title="Abrir ajustes del sistema" variant="secondary" onPress={() => void Linking.openSettings()} />
          </View>
        </Notice>
      )}
    </Group>
  );
}

export function SettingsScreen() {
  const [celebrationSound, setCelebrationSound] = useCelebrationSound();
  const { colors } = useTheme();
  const { state } = useProgress();
  const actions = useProgressActions();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const hasProgress =
    Object.keys(state.words).length > 0 || state.sessions.length > 0 || state.practiceDays.length > 0;

  return (
    <Screen>
      <AccountGroup />

      <Group title="Práctica">
        <Choices
          legend="Palabras por sesión"
          options={SESSION_SIZES.map((n) => ({ value: n, label: String(n) }))}
          value={state.preferences.sessionSize}
          onChange={(sessionSize) => actions.updatePreferences({ sessionSize })}
        />
        <Toggle
          label="Sonido de celebración"
          hint="Un acorde breve y una vibración al terminar una sesión, junto al confeti. Solo en este dispositivo."
          value={celebrationSound}
          onChange={setCelebrationSound}
        />
      </Group>

      <Group title="Pronunciación">
        <VoiceNotice />
        <Toggle
          label="Pronunciación automática"
          hint="Escucha cada palabra al aparecer en la práctica."
          value={state.preferences.autoPronounce}
          onChange={(autoPronounce) => actions.updatePreferences({ autoPronounce })}
        />
        <Choices
          legend="Velocidad"
          options={RATES}
          value={state.preferences.speechRate}
          onChange={(speechRate) => actions.updatePreferences({ speechRate })}
        />
      </Group>

      <ReminderGroup />

      <Group title="Datos">
        <AppText variant="subheading">Borrar progreso</AppText>
        <AppText variant="small">
          Elimina tus palabras aprendidas, la racha y las sesiones. Si tienes cuenta, también se borran en tus otros
          dispositivos. No se puede deshacer.
        </AppText>
        {confirmReset ? (
          <View style={{ gap: 8 }}>
            <Button
              title="Sí, borrar todo"
              variant="danger"
              onPress={() => {
                actions.resetProgress();
                setConfirmReset(false);
                setResetDone(true);
              }}
            />
            <Button title="Cancelar" variant="secondary" onPress={() => setConfirmReset(false)} />
          </View>
        ) : (
          <Button
            title="Borrar progreso"
            variant="danger"
            disabled={!hasProgress}
            onPress={() => {
              setResetDone(false);
              setConfirmReset(true);
            }}
          />
        )}
        {resetDone && (
          <AppText variant="subheading" color={colors.learned} accessibilityLiveRegion="polite">
            Progreso borrado.
          </AppText>
        )}
      </Group>

      <Button title="Política de privacidad" variant="ghost" accessibilityRole="link" onPress={() => void Linking.openURL(PRIVACY_URL)} />
    </Screen>
  );
}
