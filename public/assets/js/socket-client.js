(function () {
  const accessTokenKey = "medexplain_access_token";
  const listeners = new EventTarget();
  let socket = null;
  let loadingClient = null;

  function token() {
    return sessionStorage.getItem(accessTokenKey);
  }

  function emitLocal(type, detail) {
    window.dispatchEvent(new CustomEvent("medexplain:realtime", { detail: { type, payload: detail } }));
    listeners.dispatchEvent(new CustomEvent(type, { detail }));
  }

  function loadSocketIoClient() {
    if (window.io) return Promise.resolve();
    if (loadingClient) return loadingClient;
    loadingClient = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/socket.io/socket.io.js";
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return loadingClient;
  }

  async function connect() {
    if (!token()) return null;
    await loadSocketIoClient();
    if (socket?.connected) return socket;
    socket = window.io("/", {
      auth: { token: token() },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 750,
      transports: ["websocket", "polling"]
    });

    [
      "user_connected",
      "user_disconnected",
      "message_receive",
      "typing_start",
      "typing_stop",
      "message_read",
      "chat_session_created",
      "appointment_created",
      "appointment_confirmed",
      "appointment_cancelled",
      "appointment_completed",
      "appointment_reminder",
      "doctor_online",
      "doctor_offline",
      "doctor_available",
      "doctor_unavailable",
      "doctor_verified",
      "notification_push",
      "notification_read",
      "notification_clear",
      "ai_processing_started",
      "ai_processing_progress",
      "ai_processing_completed",
      "ai_analysis_ready"
    ].forEach((eventName) => {
      socket.on(eventName, (payload) => emitLocal(eventName, payload));
    });

    socket.on("connect", () => emitLocal("socket_connected", { socketId: socket.id }));
    socket.on("disconnect", (reason) => emitLocal("socket_disconnected", { reason }));
    socket.on("connect_error", (error) => emitLocal("socket_error", { message: error.message }));
    return socket;
  }

  function ackEmit(eventName, payload) {
    return new Promise((resolve, reject) => {
      if (!socket?.connected) return reject(new Error("Realtime connection is not available."));
      socket.emit(eventName, payload, (response) => {
        if (response?.ok === false) return reject(new Error(response.error || "Realtime event failed."));
        return resolve(response);
      });
    });
  }

  window.medRealtime = {
    connect,
    on(eventName, callback) {
      listeners.addEventListener(eventName, (event) => callback(event.detail));
    },
    joinAppointment(appointmentId) {
      return ackEmit("join_appointment", { appointmentId });
    },
    joinChat(chatSessionId) {
      return ackEmit("join_chat", { chatSessionId });
    },
    joinConsultation(consultationSessionId) {
      return ackEmit("join_chat", { consultationSessionId });
    },
    sendMessage({ sessionId, content }) {
      return ackEmit("message_send", { sessionId, content });
    },
    typingStart(sessionId) {
      socket?.emit("typing_start", { sessionId });
    },
    typingStop(sessionId) {
      socket?.emit("typing_stop", { sessionId });
    },
    markMessageRead({ sessionId, messageId }) {
      socket?.emit("message_read", { sessionId, messageId });
    },
    markNotificationRead(notificationId) {
      socket?.emit("notification_read", { notificationId });
    },
    clearNotifications() {
      socket?.emit("notification_clear");
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    connect().catch(() => {});
  });
})();
