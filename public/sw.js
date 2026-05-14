/* global self, clients */
self.addEventListener("push", function (event) {
  let data = { title: "StichKala", body: "New update", url: "/" };
  try {
    if (event.data) {
      const parsed = event.data.json();
      if (parsed && typeof parsed === "object") {
        data = { ...data, ...parsed };
      }
    }
  } catch (e) {
    /* use defaults */
  }
  const title = data.title || "StichKala";
  const url = typeof data.url === "string" ? data.url : "/";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const raw = event.notification.data && event.notification.data.url;
  let target = typeof raw === "string" && raw.length ? raw : "/";
  if (target.startsWith("/") && self.location && self.location.origin) {
    try {
      target = new URL(target, self.location.origin).href;
    } catch (e) {
      target = self.location.origin + (target.startsWith("/") ? target : "/" + target);
    }
  }
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        if ("focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
