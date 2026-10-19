"use client";

import { Briefcase, Check, Copy, Download, Mail, MessageCircle, Printer, Send, Share2, ThumbsUp, X, type LucideIcon } from "lucide-react";
import { useRef, useState, useSyncExternalStore } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { LexiQr } from "@/features/share/lexi-qr";
import { shareLinks } from "@/features/share/links";
import { SHARE_TEXT, SHARE_URL } from "@lexi/core/data/share";

const ICONS: Record<string, LucideIcon> = {
  whatsapp: MessageCircle,
  telegram: Send,
  facebook: ThumbsUp,
  x: X,
  linkedin: Briefcase,
  email: Mail,
};

const noop = () => () => {};
/** The system share sheet (phones and some browsers); `false` on the server and while hydrating. */
function useCanShare() {
  return useSyncExternalStore(
    noop,
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );
}

export function ShareView() {
  const canShare = useCanShare();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const displayUrl = SHARE_URL.replace(/^https:\/\//, "");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      setMessage({ ok: true, text: "Enlace copiado." });
    } catch {
      // Without clipboard permission: leave the link selected so it can be copied by hand.
      input.current?.focus();
      input.current?.select();
      setMessage({ ok: false, text: "No se pudo copiar automáticamente: el enlace está seleccionado, cópialo." });
    }
  };

  return (
    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6">
      <header>
        <h1 className="font-display text-4xl font-bold tracking-tight">Comparte Lexi</h1>
        <p className="mt-2 text-lg text-ink-soft">Ayuda a alguien a aprender inglés: es gratis.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[auto_minmax(0,1fr)]">
        <section aria-labelledby="qr-titulo" className="grid min-w-0 justify-items-center gap-4 rounded-3xl bg-surface p-6 sm:p-8">
          <h2 id="qr-titulo" className="sr-only">
            Código QR
          </h2>
          <div className="rounded-2xl border border-line bg-white p-2">
            <LexiQr className="size-56 sm:size-64" />
          </div>
          <p className="text-sm text-ink-soft">Escanéalo con la cámara del móvil.</p>
          <div className="grid w-full grid-cols-2 gap-2">
            <a href="/qr/lexiapp-qr.png" download="lexi-qr.png" className={buttonClasses("secondary", "md", "text-sm")}>
              <Download aria-hidden className="size-4 shrink-0" />
              QR (PNG)
            </a>
            <a href="/qr/lexiapp-qr.svg" download="lexi-qr.svg" className={buttonClasses("secondary", "md", "text-sm")}>
              <Printer aria-hidden className="size-4 shrink-0" />
              Para imprimir
            </a>
          </div>
        </section>

        <section aria-labelledby="enlace-titulo" className="grid min-w-0 grid-cols-1 content-start gap-5 rounded-3xl bg-surface p-6 sm:p-8">
          <div>
            <h2 id="enlace-titulo" className="font-display text-xl font-semibold">
              Enlace
            </h2>
            <div className="mt-3 flex gap-2">
              <input
                ref={input}
                readOnly
                value={displayUrl}
                aria-label="Enlace de Lexi"
                onFocus={(e) => e.currentTarget.select()}
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-sunken px-4 font-semibold"
              />
              <Button onClick={() => void copy()} aria-label="Copiar enlace">
                <Copy aria-hidden className="size-4" />
                Copiar
              </Button>
            </div>
            <p
              role="status"
              aria-live="polite"
              className={cn("mt-2 flex items-center gap-1.5 text-sm font-semibold empty:hidden", message?.ok ? "text-learned" : "text-review")}
            >
              {message?.ok && <Check aria-hidden className="size-4" />}
              {message?.text}
            </p>
          </div>

          {canShare && (
            <Button
              variant="secondary"
              size="lg"
              className="w-full py-2 text-center whitespace-normal"
              onClick={() => void navigator.share({ title: "Lexi", text: SHARE_TEXT, url: SHARE_URL }).catch(() => {})}
            >
              <Share2 aria-hidden className="size-5 shrink-0 text-accent" />
              Compartir… (WhatsApp, Instagram…)
            </Button>
          )}

          <div>
            <h2 className="text-sm font-semibold text-ink-soft">{canShare ? "O directamente" : "Compartir en"}</h2>
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {shareLinks().map(({ id, label, href }) => {
                const Icon = ICONS[id];
                return (
                  <li key={id}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonClasses("secondary", "md", "w-full justify-start")}
                    >
                      <Icon aria-hidden className="size-4 shrink-0 text-accent" />
                      {label}
                      <span className="sr-only"> (se abre en otra pestaña)</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
