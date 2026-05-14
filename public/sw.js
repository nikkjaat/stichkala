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

function resolveTargetUrl(raw) {
  var target = typeof raw === "string" && raw.length ? raw : "/";
  if (target.startsWith("/") && self.location && self.location.origin) {
    try {
      target = new URL(target, self.location.origin).href;
    } catch (e) {
      target =
        self.location.origin + (target.startsWith("/") ? target : "/" + target);
    }
  }
  return target;
}

function postNavigateToClients(target) {
  var msg = { type: "sk-notification-navigate", url: target };
  return self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then(function (list) {
      if (!list.length) {
        if (self.clients.openWindow) return self.clients.openWindow(target);
        return Promise.resolve();
      }
      for (var i = 0; i < list.length; i++) {
        try {
          list[i].postMessage(msg);
        } catch (e) {
          /* ignore */
        }
      }
      var first = list[0];
      if (first && "focus" in first && typeof first.focus === "function") {
        return Promise.resolve(first.focus()).catch(function () {
          if (self.clients.openWindow) return self.clients.openWindow(target);
        });
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
      return Promise.resolve();
    });
}

self.addEventListener("notificationclick", function (event) {
  var notification = event.notification;
  notification.close();
  var data = notification.data || {};
  var action = event.action || "";

  if (action === "read") {
    var tid = typeof data.readThreadId === "string" ? data.readThreadId.trim() : "";
    if (!tid) return;
    var isAdmin = data.readAsAdmin === "1";
    var cid = typeof data.readClientId === "string" ? data.readClientId.trim() : "";
    if (!isAdmin && !cid) return;
    var bodyObj = isAdmin ? { asAdmin: true } : { clientId: cid };
    event.waitUntil(
      fetch(
        self.location.origin + "/api/chat/threads/" + encodeURIComponent(tid) + "/read",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyObj),
          credentials: isAdmin ? "include" : "same-origin",
        }
      )
        .then(function () {
          return self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then(function (list) {
              for (var j = 0; j < list.length; j++) {
                try {
                  list[j].postMessage({ type: "sk-notification-read-finished" });
                } catch (e) {
                  /* ignore */
                }
              }
            });
        })
        .catch(function () {})
    );
    return;
  }

  var raw =
    action === "reply"
      ? data.replyUrl || data.url
      : data.url;
  var target = resolveTargetUrl(raw);
  event.waitUntil(postNavigateToClients(target));
});
