// Lexi's service worker: only shows the daily reminder (docs/15-recordatorios.md).
// No offline cache: pages and audio load from the network as always.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Lexi", {
      body: data.body || "Tus palabras te esperan.",
      icon: "/apple-icon",
      badge: "/apple-icon",
      lang: "es",
      tag: "lexi-recordatorio",
      data: { url: data.url || "/practicar" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/practicar", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (open) return open.focus().then((client) => client.navigate(url));
      return self.clients.openWindow(url);
    }),
  );
});
