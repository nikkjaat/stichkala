/* global self, clients */
self.addEventListener("push", function (event) {
  var payload = { title: "StichKalaa", body: "New update", url: "/" };
  try {
    if (event.data) {
      var parsed = event.data.json();
      if (parsed && typeof parsed === "object") {
        for (var key in parsed) {
          if (Object.prototype.hasOwnProperty.call(parsed, key)) {
            payload[key] = parsed[key];
          }
        }
      }
    }
  } catch (e) {
    /* use defaults */
  }
  var title = String(payload.title || "StichKalaa").slice(0, 80);
  var bodyStr = String(payload.body || "").slice(0, 240);
  var clickUrl =
    typeof payload.url === "string" && payload.url.length
      ? payload.url
      : self.location.origin + "/";
  var tid =
    typeof payload.readThreadId === "string" ? payload.readThreadId.trim() : "";
  var cid =
    typeof payload.readClientId === "string" ? payload.readClientId.trim() : "";
  var isAdm = payload.readAsAdmin === "1" || payload.readAsAdmin === 1;
  var withActions = Boolean(tid && (isAdm || cid));
  var dataObj = { url: clickUrl };
  if (withActions) {
    dataObj.readThreadId = tid;
    dataObj.readClientId = cid;
    dataObj.readAsAdmin = isAdm ? "1" : "0";
    dataObj.replyUrl =
      typeof payload.replyUrl === "string" && payload.replyUrl.length
        ? payload.replyUrl
        : clickUrl;
  }
  var dataStr = JSON.stringify(dataObj);
  var baseBody = bodyStr || "New update";
  var p;
  if (withActions) {
    p = self.registration
      .showNotification(title, {
        body: baseBody,
        icon: "/logo-192.png",
        badge: "/logo-192.png",
        data: dataStr,
        actions: [
          {
            action: "reply",
            title: "Reply",
            type: "text",
            placeholder: "Write a message…",
          },
          { action: "read", title: "Read" },
        ],
      })
      .catch(function () {
        return self.registration.showNotification(title, {
          body: baseBody,
          icon: "/logo-192.png",
          badge: "/logo-192.png",
          data: dataStr,
          actions: [
            { action: "reply", title: "Reply" },
            { action: "read", title: "Read" },
          ],
        });
      });
  } else {
    p = self.registration.showNotification(title, {
      body: baseBody,
      icon: "/logo-192.png",
      badge: "/logo-192.png",
      data: dataStr,
    });
  }
  event.waitUntil(p);
});

function parseNotificationData(raw) {
  if (raw == null || raw === "") return {};
  if (typeof raw === "string") {
    try {
      var o = JSON.parse(raw);
      return typeof o === "object" && o && !Array.isArray(o) ? o : {};
    } catch (e) {
      return {};
    }
  }
  if (typeof raw === "object" && raw && !Array.isArray(raw)) {
    if (typeof raw.sk === "string") {
      try {
        var inner = JSON.parse(raw.sk);
        if (typeof inner === "object" && inner && !Array.isArray(inner)) {
          return Object.assign({}, raw, inner);
        }
      } catch (e2) {
        /* ignore */
      }
    }
    return raw;
  }
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

/**
 * Chromium: `event.reply` may be a string or a Promise<string>. It must be
 * chained from notificationclick so waitUntil keeps the SW alive.
 */
function normalizeReplyText(event) {
  try {
    if (event && Object.prototype.hasOwnProperty.call(event, "reply")) {
      var r0 = event.reply;
      if (typeof r0 === "string") return Promise.resolve(r0);
      if (r0 != null && typeof r0.then === "function") {
        return r0.then(function (x) {
          return String(x == null ? "" : x);
        });
      }
    }
  } catch (e) {
    /* ignore */
  }
  var candidates = [
    event && event.userReply,
    event && event.notification && event.notification.reply,
    event && event.notification && event.notification.userReply,
  ];
  for (var i = 0; i < candidates.length; i++) {
    var r = candidates[i];
    if (typeof r === "string") return Promise.resolve(r);
    if (r && typeof r.then === "function") {
      return r.then(function (x) {
        return String(x == null ? "" : x);
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
  var tid =
    typeof data.readThreadId === "string" ? data.readThreadId.trim() : "";
  var isAdmin = data.readAsAdmin === "1";
  var cid =
    typeof data.readClientId === "string" ? data.readClientId.trim() : "";
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
    url = origin + "/api/chat/threads/" + encodeURIComponent(tid) + "/messages";
    body = JSON.stringify({ clientId: cid, text: text });
  }
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body,
    credentials: "include",
    cache: "no-store",
    mode: "same-origin",
  })
    .then(function (r) {
      if (!r.ok) return Promise.reject(new Error("send http " + r.status));
      return r.json().catch(function () {
        return Promise.reject(new Error("send not json"));
      });
    })
    .then(function (json) {
      if (!json || !json.success)
        return Promise.reject(new Error("send rejected"));
      return notifyAllClients({
        type: "sk-notification-chat-sent",
        threadId: tid,
      });
    })
    .catch(function () {
      return postNavigateToClients(resolveTargetUrl(data.replyUrl || data.url));
    });
}

self.addEventListener("notificationclick", function (event) {
  var notification = event.notification;
  var data = parseNotificationData(notification.data);
  var action = (event.action || "").trim();

  if (action === "read") {
    try {
      notification.close();
    } catch (e) {}
    var tidRead =
      typeof data.readThreadId === "string" ? data.readThreadId.trim() : "";
    if (!tidRead) return;
    var isAdminRead = data.readAsAdmin === "1";
    var cidRead =
      typeof data.readClientId === "string" ? data.readClientId.trim() : "";
    if (!isAdminRead && !cidRead) return;
    var bodyObj = isAdminRead ? { asAdmin: true } : { clientId: cidRead };
    event.waitUntil(
      fetch(
        self.location.origin +
          "/api/chat/threads/" +
          encodeURIComponent(tidRead) +
          "/read",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyObj),
          credentials: "include",
          cache: "no-store",
          mode: "same-origin",
        }
      )
        .then(function () {
          return notifyAllClients({ type: "sk-notification-read-finished" });
        })
        .catch(function () {})
    );
    return;
  }

  event.waitUntil(
    normalizeReplyText(event)
      .then(function (raw) {
        var text = String(raw || "")
          .trim()
          .slice(0, 4000);
        var tid =
          typeof data.readThreadId === "string" ? data.readThreadId.trim() : "";
        if (text && tid) {
          try {
            notification.close();
          } catch (e2) {}
          return sendNotifChatMessage(data, text);
        }
        try {
          notification.close();
        } catch (e3) {}
        var dest =
          action === "reply"
            ? resolveTargetUrl(data.replyUrl || data.url)
            : resolveTargetUrl(data.url);
        return postNavigateToClients(dest);
      })
      .catch(function () {
        try {
          notification.close();
        } catch (e4) {}
        return postNavigateToClients(
          resolveTargetUrl(
            action === "reply" ? data.replyUrl || data.url : data.url
          )
        );
      })
  );
});
