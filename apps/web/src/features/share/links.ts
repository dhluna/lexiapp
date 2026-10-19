import { SHARE_TEXT, SHARE_URL } from "@lexi/core/data/share";

export interface ShareLink {
  id: string;
  label: string;
  href: string;
}

/** Each network's own share page: they only receive the message and the link, nothing about the user. */
export function shareLinks(text = SHARE_TEXT, url = SHARE_URL): ShareLink[] {
  const t = encodeURIComponent(text);
  const u = encodeURIComponent(url);
  const both = encodeURIComponent(`${text} ${url}`);
  return [
    { id: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${both}` },
    { id: "telegram", label: "Telegram", href: `https://t.me/share/url?url=${u}&text=${t}` },
    { id: "facebook", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { id: "x", label: "X", href: `https://x.com/intent/post?text=${t}&url=${u}` },
    { id: "linkedin", label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { id: "email", label: "Correo", href: `mailto:?subject=${encodeURIComponent("Te recomiendo Lexi")}&body=${both}` },
  ];
}
