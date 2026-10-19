import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomeView } from "@/features/home/home-view";
import { SettingsView } from "@/features/settings/settings-view";
import { shareLinks } from "@/features/share/links";
import { ShareView } from "@/features/share/share-view";
import { renderWithServices } from "@/test/render";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  usePathname: () => "/",
}));

afterEach(() => vi.unstubAllGlobals());

describe("share Lexi", () => {
  it("builds each network's link with the message and the encoded URL", () => {
    const links = Object.fromEntries(shareLinks("Hola Lexi:", "https://lexiapp.app").map((l) => [l.id, l.href]));
    expect(links.whatsapp).toBe("https://wa.me/?text=Hola%20Lexi%3A%20https%3A%2F%2Flexiapp.app");
    expect(links.telegram).toBe("https://t.me/share/url?url=https%3A%2F%2Flexiapp.app&text=Hola%20Lexi%3A");
    expect(links.facebook).toBe("https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Flexiapp.app");
    expect(links.x).toBe("https://x.com/intent/post?text=Hola%20Lexi%3A&url=https%3A%2F%2Flexiapp.app");
    expect(links.linkedin).toBe("https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Flexiapp.app");
    expect(links.email).toMatch(/^mailto:\?subject=Te%20recomiendo%20Lexi&body=Hola%20Lexi%3A%20https/);
  });

  it("shows the QR code, the downloads and the networks, opening in a new tab", () => {
    renderWithServices(<ShareView />);
    expect(screen.getByRole("img", { name: "Código QR que abre lexiapp.app" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /QR \(PNG\)/ })).toHaveAttribute("href", "/qr/lexiapp-qr.png");
    expect(screen.getByRole("link", { name: /Para imprimir/ })).toHaveAttribute("href", "/qr/lexiapp-qr.svg");
    const whatsapp = screen.getByRole("link", { name: /WhatsApp/ });
    expect(whatsapp).toHaveAttribute("target", "_blank");
    expect(whatsapp).toHaveAttribute("rel", "noopener noreferrer");
    // Without the Web Share API (desktop) there is no "Compartir…" button.
    expect(screen.queryByRole("button", { name: /Compartir…/ })).not.toBeInTheDocument();
  });

  it("copies the link and announces it", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    renderWithServices(<ShareView />);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    await user.click(screen.getByRole("button", { name: "Copiar enlace" }));
    expect(writeText).toHaveBeenCalledWith("https://lexiapp.app");
    expect(screen.getByRole("status")).toHaveTextContent("Enlace copiado.");
  });

  it("selects the link when the clipboard is not allowed", async () => {
    const user = userEvent.setup();
    renderWithServices(<ShareView />);
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) }, configurable: true });
    await user.click(screen.getByRole("button", { name: "Copiar enlace" }));
    expect(screen.getByRole("status")).toHaveTextContent("el enlace está seleccionado");
    expect(screen.getByRole("textbox", { name: "Enlace de Lexi" })).toHaveFocus();
  });

  it("offers the system share sheet where it exists", async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, share });
    renderWithServices(<ShareView />);
    await user.click(screen.getByRole("button", { name: /Compartir…/ }));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: "https://lexiapp.app" }));
  });

  it("is reachable from the home screen and from settings", () => {
    const { unmount } = renderWithServices(<HomeView />);
    expect(screen.getByRole("link", { name: /Compártela/ })).toHaveAttribute("href", "/compartir");
    unmount();
    renderWithServices(<SettingsView />);
    expect(screen.getByRole("link", { name: "Compartir Lexi" })).toHaveAttribute("href", "/compartir");
  });
});
