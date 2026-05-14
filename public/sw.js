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

function parseNotificationData(raw) {
  if (raw == null || raw === "") return {};
  if (typeof raw === "string") {
    try {
      var o = JSON.parse(raw);
      return typeof o === "object" && o ? o : {};
    } catch (e) {
      return {};
    }
  }
  if (typeof raw === "object") return raw;
  return {};
}

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

/** Chromium / variants: inline reply from notification text action (read before closing notification). */
function normalizeReplyText(event) {
  var candidates = [
    event.reply,
    event.userReply,
    event.notification && event.notification.reply,
    event.notification && event.notification.userReply,
  ];
  for (var i = 0; i < candidates.length; i++) {
    var r = candidates[i];
    if (typeof r === "string") return Promise.resolve(r);
    if (r && typeof r.then === "function") {
      return r.then(function (x) {
        return String(x || "");
      });
    }
  }
  return Promise.resolve("");
}

function notifyAllClients(payload) {
  return self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then(function (list) {
      for (var i = 0; i < list.length; i++) {
        try {
          list[i].postMessage(payload);
        } catch (e) {
          /* ignore */
        }
      }
    });
}

function sendNotifChatMessage(data, text) {
  var tid = typeof data.readThreadId === "string" ? data.readThreadId.trim() : "";
  var isAdmin = data.readAsAdmin === "1";
  var cid = typeof data.readClientId === "string" ? data.readClientId.trim() : "";
  if (!tid || !text) return Promise.resolve();
  var origin = self.location.origin;
  var url;
  var body;
  if (isAdmin) {
    url =
      origin +
      "/api/chat/admin/threads/" +
      encodeURIComponent(tid) +
      "/messages";
    body = JSON.stringify({ text: text });
  } else {
    if (!cid) return Promise.resolve();
    url =
      origin + "/api/chat/threads/" + encodeURIComponent(tid) + "/messages";
    body = JSON.stringify({ clientId: cid, text: text });
  }
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body,
    credentials: "include",
  })
    .then(function (r) {
      if (!r.ok) return Promise.reject(new Error("send http " + r.status));
      return r.json();
    })
    .then(function (json) {
      if (!json || !json.success) return Promise.reject(new Error("send rejected"));
      return notifyAllClients({
        type: "sk-notification-chat-sent",
        threadId: tid,
      });
    })
    .catch(function () {
      return postNavigateToClients(
        resolveTargetUrl(data.replyUrl || data.url)
      );
    });
}

self.addEventListener("notificationclick", function (event) {
  var notification = event.notification;
  var data = parseNotificationData(notification.data);
  var action = event.action || "";

  if (action === "read") {
    try {
      notification.close();
    } catch (e) {}
    var tid = typeof data.readThreadId === "string" ? data.readThreadId.trim() : "";
    if (!tid) return;
    var isAdmin = data.readAsAdmin === "1";
    var cid = typeof data.readClientId === "string" ? data.readClientId.trim() : "";
    if (!isAdmin && !cid) return;
    var bodyObj = isAdmin ? { asAdmin: true } : { clientId: cid };
    event.waitUntil(
      fetch(
        self.location.origin +
          "/api/chat/threads/" +
          encodeURIComponent(tid) +
          "/read",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyObj),
          credentials: "include",
        }
      )
        .then(function () {
          return notifyAllClients({ type: "sk-notification-read-finished" });
        })
        .catch(function () {})
    );
    return;
  }

  if (action === "reply") {
    event.waitUntil(
      normalizeReplyText(event)
        .then(function (raw) {
          var text = String(raw || "").trim().slice(0, 4000);
          try {
            notification.close();
          } catch (e2) {}
          if (text) return sendNotifChatMessage(data, text);
          return postNavigateToClients(
            resolveTargetUrl(data.replyUrl || data.url)
          );
        })
        .catch(function () {
          try {
            notification.close();
          } catch (e3) {}
          return postNavigateToClients(
            resolveTargetUrl(data.replyUrl || data.url)
          );
        })
    );
    return;
  }

  try {
    notification.close();
  } catch (e) {}
  var raw = typeof data.url === "string" ? data.url : "/";
  event.waitUntil(postNavigateToClients(resolveTargetUrl(raw)));
});
