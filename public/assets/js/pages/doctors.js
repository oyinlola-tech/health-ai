/**
 * @file Chat, doctor marketplace, careers, profiles, and appointment pages.
 * @module assets/js/pages/doctors.js
 */

// -----------------------------------------------------------------------------
// Chat, doctor marketplace, careers, profiles, and appointment pages.
// -----------------------------------------------------------------------------

async function renderChat() {
  const meta = routeTitle("/chat");
  setMain(`${pageHeader(meta)}${loadingState("Loading chat")}`);
  try {
    const history = await apiRequest("/ai/chat-history");
    const messages = history.data?.messages || [];
    window.medExplainChatMessages = messages;
    setMain(renderChatWorkspace(messages));
    bindAiChatForm();
  } catch (error) {
    const message = error?.status === 401 ? "Please sign in again." : "Server connection unavailable. Please try again.";
    setMain(`${pageHeader(meta)}${errorState(message)}`);
  }
}

function renderChatWorkspace(messages = []) {
  const threads = chatThreadsFromMessages(messages);
  const activeThread = threads[0] || null;
  return `<section class="chat-workspace ai-chat-workspace" data-chat-workspace>
    <aside class="chat-sidebar ai-chat-sidebar" aria-label="Past conversations">
      <div class="chat-sidebar-header">
        <div>
          <h2>Chats</h2>
          <p class="muted">Recent conversations</p>
        </div>
        <button class="icon-button" type="button" data-new-chat aria-label="New chat">${icon("add")}</button>
      </div>
      <div class="chat-topic-list" data-chat-thread-list>
        ${renderChatThreadList(threads, activeThread?.id)}
      </div>
    </aside>
    <section class="chat-panel">
      <header class="chat-panel-header ai-chat-header">
        <div>
          <h2 data-chat-title>${escapeHtml(activeThread?.title || "New chat")}</h2>
          <p class="muted" data-chat-subtitle>Ask about symptoms, reports, medications, next steps, or general health questions.</p>
        </div>
        <button class="btn btn-secondary" type="button" data-new-chat>${icon("edit_square")}New chat</button>
      </header>
      <div class="chat-thread" data-ai-chat-thread>
        ${renderAiChatMessages(activeThread?.messages || [])}
      </div>
      <form class="chat-composer" data-ai-chat-form novalidate>
        <div class="form-message" data-form-message hidden></div>
        <label class="sr-only" for="message">Ask MedExplain AI</label>
        <input class="chat-file-input" id="chat-report-upload" name="report" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" data-chat-file-input>
        <div class="chat-attachment-chip" data-chat-attachment hidden></div>
        <div class="chat-input-shell">
          <button class="icon-button chat-upload-button" type="button" data-chat-upload-button aria-label="Upload a report for AI context">${icon("upload_file")}</button>
          <textarea id="message" name="message" placeholder="Ask anything about your health reports..." required></textarea>
          <button class="icon-button chat-send-button" type="submit" data-chat-send-button aria-label="Send message">${icon("send")}</button>
        </div>
        <span class="field-error" data-error-for="message"></span>
      </form>
    </section>
  </section>`;
}

function createClientThreadId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (char) => (Number(char) ^ (Math.random() * 16) >> (Number(char) / 4)).toString(16));
}

function chatMessageThreadId(message = {}) {
  const metadata = message.metadata || {};
  if (metadata.threadId) return metadata.threadId;
  if (metadata.thread_id) return metadata.thread_id;
  window.medExplainLegacyThreadId = window.medExplainLegacyThreadId || createClientThreadId();
  return window.medExplainLegacyThreadId;
}

function chatThreadsFromMessages(messages = []) {
  const threadMap = new Map();
  messages.forEach((message, index) => {
    const role = String(message.role || "assistant").toLowerCase();
    const threadId = chatMessageThreadId(message);
    if (!threadMap.has(threadId)) {
      threadMap.set(threadId, {
        id: threadId,
        title: "New chat",
        createdAt: message.created_at || message.createdAt || "",
        updatedAt: message.created_at || message.createdAt || "",
        messages: []
      });
    }
    const current = threadMap.get(threadId);
    if (role === "user" && current.title === "New chat") current.title = String(message.content || "New chat").slice(0, 72);
    current.updatedAt = message.created_at || message.createdAt || current.updatedAt;
    current.messages.push({ ...message, id: message.id || `${threadId}-${index}` });
  });
  return [...threadMap.values()].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
}

function renderChatThreadList(threads = [], activeId = "") {
  if (!threads.length) return `<section class="chat-sidebar-empty"><div class="state-icon">${icon("forum")}</div><p class="muted">Your saved chats will appear here after you start talking.</p></section>`;
  return threads
    .map((thread) => `<button class="chat-topic" type="button" data-chat-thread-id="${escapeHtml(thread.id)}"${thread.id === activeId ? ' aria-current="true"' : ""}><span>${escapeHtml(thread.title)}</span><small>${escapeHtml(thread.messages.length)} message${thread.messages.length === 1 ? "" : "s"}</small></button>`)
    .join("");
}

function renderAiChatMessages(messages = []) {
  if (!messages.length) {
    return `<section class="chat-empty"><div class="state-icon">${icon("psychology")}</div><h2>How can I help with your health today?</h2><p class="muted">Ask about symptoms, medication questions, report context, or what to discuss with a clinician. Uploading a file is optional.</p></section>`;
  }
  return messages.map((message, index) => renderAiChatMessage(message, index)).join("");
}

function renderThinkingMessage() {
  return `<article class="message-bubble thinking-bubble" data-thinking-message data-role="assistant"><p class="caption">MedExplain AI</p><p><span class="thinking-dots"><span></span><span></span><span></span></span><span data-thinking-text>Reading your message</span></p></article>`;
}

function formatChatContent(content = "") {
  return escapeHtml(content).replace(/\n/g, "<br>");
}

function renderAiChatMessage(message, index = 0) {
  const role = String(message.role || "assistant").toLowerCase();
  const label = role === "user" ? "You" : "MedExplain AI";
  return `<article class="message-bubble" id="message-${escapeHtml(message.id || index)}" data-role="${escapeHtml(role)}"><p class="caption">${escapeHtml(label)}</p><p>${formatChatContent(message.content || "")}</p></article>`;
}

function chatErrorMessage(error) {
  if (error?.status === 401) return "Please sign in again.";
  if (error?.payload?.error?.code === "AI_BUDGET_EXCEEDED") return "AI usage was limited by the current budget setting. Please try again after the quota resets or ask an admin to review AI limits.";
  if (error?.payload?.error?.code === "AI_RATE_LIMITED" || error?.status === 429) return "Please pause briefly before sending another AI message.";
  if (error?.payload?.error?.code === "AI_PROVIDER_UNAVAILABLE") return "Google Gemini is unreachable right now. Please check your connection and try again in a moment.";
  if (error?.payload?.error?.code === "PLAN_LIMIT_REACHED") return "This request is temporarily limited. Please try again later.";
  if (error?.status === 403) return error?.message || "Your account does not currently have access to AI chat.";
  if (error?.payload?.error?.code === "CONFIGURATION_ERROR") return "AI service is not configured for this environment.";
  return error?.message || "Server connection unavailable. Please try again.";
}

function bindAiChatForm() {
  const form = document.querySelector("[data-ai-chat-form]");
  const textareaField = form?.querySelector('[name="message"]');
  const inputShell = form?.querySelector(".chat-input-shell");
  const fileInput = form?.querySelector("[data-chat-file-input]");
  const uploadButton = form?.querySelector("[data-chat-upload-button]");
  const sendButton = form?.querySelector("[data-chat-send-button]");
  const attachmentChip = form?.querySelector("[data-chat-attachment]");
  const thread = document.querySelector("[data-ai-chat-thread]");
  const threadList = document.querySelector("[data-chat-thread-list]");
  const titleTarget = document.querySelector("[data-chat-title]");
  const subtitleTarget = document.querySelector("[data-chat-subtitle]");
  const initialThreads = chatThreadsFromMessages(window.medExplainChatMessages || []);
  let activeThreadId = initialThreads[0]?.id || createClientThreadId();
  let activeController = null;
  let thinkingTimer = null;
  let stopRequested = false;
  let attachedReport = null;
  const syncComposerState = () => {
    if (!textareaField) return;
    textareaField.style.height = "auto";
    textareaField.style.height = `${Math.min(textareaField.scrollHeight, 160)}px`;
    inputShell?.toggleAttribute("data-has-value", Boolean(textareaField.value.trim()));
  };
  const renderAttachment = () => {
    if (!attachmentChip) return;
    if (!attachedReport) {
      attachmentChip.hidden = true;
      attachmentChip.innerHTML = "";
      return;
    }
    attachmentChip.hidden = false;
    attachmentChip.innerHTML = `${icon("description")}<span><strong>${escapeHtml(attachedReport.title || attachedReport.original_name || "Uploaded report")}</strong><small>${escapeHtml(displayStatus(attachedReport.extraction_status || attachedReport.status || "processing"))}</small></span><button class="icon-button" type="button" data-clear-chat-report aria-label="Remove attached report">${icon("close")}</button>`;
  };
  const setChatStatus = (stateName, message) => {
    showFormMessage(form, stateName, message);
  };
  const setThinkingState = (isThinking) => {
    if (!sendButton) return;
    sendButton.dataset.state = isThinking ? "thinking" : "idle";
    sendButton.setAttribute("aria-label", isThinking ? "Stop response" : "Send message");
    sendButton.innerHTML = isThinking ? icon("stop") : icon("send");
  };
  const startThinkingStatus = () => {
    const steps = ["Reading your message", "Checking trusted context", "Preparing a careful answer"];
    let index = 0;
    setChatStatus("success", steps[index]);
    thinkingTimer = window.setInterval(() => {
      index = (index + 1) % steps.length;
      setChatStatus("success", steps[index]);
      document.querySelector("[data-thinking-text]")?.replaceChildren(document.createTextNode(steps[index]));
    }, 1400);
  };
  const stopThinkingStatus = () => {
    if (thinkingTimer) window.clearInterval(thinkingTimer);
    thinkingTimer = null;
  };
  const setActiveThreadTitle = (title = "New chat") => {
    if (titleTarget) titleTarget.textContent = title;
    if (subtitleTarget) subtitleTarget.textContent = title === "New chat" ? "Ask about symptoms, reports, medications, next steps, or general health questions." : "Conversation loaded from your saved chat history.";
  };
  const clearThreadSelection = () => {
    threadList?.querySelectorAll(".chat-topic").forEach((item) => item.removeAttribute("aria-current"));
  };
  const refreshThreadList = () => {
    if (!threadList) return;
    const threads = chatThreadsFromMessages(window.medExplainChatMessages || []);
    threadList.innerHTML = renderChatThreadList(threads, activeThreadId);
  };
  textareaField?.addEventListener("input", syncComposerState);
  uploadButton?.addEventListener("click", () => fileInput?.click());
  document.querySelectorAll("[data-new-chat]").forEach((button) => {
    button.addEventListener("click", () => {
      stopRequested = Boolean(activeController);
      activeController?.abort();
      stopThinkingStatus();
      setThinkingState(false);
      activeThreadId = createClientThreadId();
      clearThreadSelection();
      attachedReport = null;
      renderAttachment();
      if (thread) thread.innerHTML = renderAiChatMessages([]);
      setActiveThreadTitle();
      textareaField?.focus();
      setChatStatus("success", "New chat ready.");
    });
  });
  threadList?.addEventListener("click", (event) => {
    const item = event.target.closest("[data-chat-thread-id]");
    if (!item) return;
    const threads = chatThreadsFromMessages(window.medExplainChatMessages || []);
    const selected = threads.find((threadItem) => threadItem.id === item.dataset.chatThreadId);
    if (!selected || !thread) return;
    activeThreadId = selected.id;
    clearThreadSelection();
    item.setAttribute("aria-current", "true");
    thread.innerHTML = renderAiChatMessages(selected.messages);
    setActiveThreadTitle(selected.title);
    thread.scrollTop = thread.scrollHeight;
  });
  attachmentChip?.addEventListener("click", (event) => {
    if (!event.target.closest("[data-clear-chat-report]")) return;
    attachedReport = null;
    if (fileInput) fileInput.value = "";
    renderAttachment();
    showFormMessage(form, "success", "Report context removed.");
  });
  fileInput?.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append("report", file);
    body.append("title", file.name.replace(/\.[^.]+$/, ""));
    uploadButton.disabled = true;
    uploadButton.dataset.loading = "true";
    showFormMessage(form, "success", "Uploading report for AI context...");
    try {
      const response = await apiRequest("/reports", { method: "POST", body, timeoutMs: 60000, timeoutMessage: "Report upload is taking longer than expected. Please try again." });
      attachedReport = response.data?.report || null;
      state.dataCache.delete("reports");
      renderAttachment();
      showFormMessage(form, "success", "Report attached. Ask a question and AI will use the extracted content.");
    } catch (error) {
      attachedReport = null;
      renderAttachment();
      showFormMessage(form, "error", error?.status === 403 ? "Your account does not currently have access to report uploads." : error.message || "Report upload failed. Please try again.");
    } finally {
      uploadButton.disabled = false;
      delete uploadButton.dataset.loading;
    }
  });
  syncComposerState();
  renderAttachment();
  window.medExplainChatMessages = window.medExplainChatMessages || [];
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (activeController) {
      stopRequested = true;
      activeController.abort();
      return;
    }
    if (!validateForm(form)) return;
    const message = textareaField.value.trim();
    activeController = new AbortController();
    stopRequested = false;
    setThinkingState(true);
    startThinkingStatus();
    try {
      thread.innerHTML = `${thread.querySelector(".chat-empty") ? "" : thread.innerHTML}`;
      thread.insertAdjacentHTML("beforeend", renderAiChatMessage({ role: "user", content: message }));
      thread.insertAdjacentHTML("beforeend", renderThinkingMessage());
      thread.scrollTop = thread.scrollHeight;
      textareaField.value = "";
      syncComposerState();
      const response = await apiRequest("/ai/chat", {
        method: "POST",
        body: { message, threadId: activeThreadId, ...(attachedReport?.id ? { reportId: attachedReport.id } : {}) },
        signal: activeController.signal,
        timeoutMs: appConfig.aiRequestTimeoutMs,
        timeoutMessage: "AI is taking longer than expected. Please try again."
      });
      const assistantMessage = response.data?.message || response.data?.response?.summary || "Response saved.";
      activeThreadId = response.data?.threadId || activeThreadId;
      document.querySelector("[data-thinking-message]")?.remove();
      thread.insertAdjacentHTML("beforeend", renderAiChatMessage({ role: "assistant", content: assistantMessage }));
      const metadata = { threadId: activeThreadId };
      window.medExplainChatMessages.push({ role: "user", content: message, metadata }, { role: "assistant", content: assistantMessage, metadata });
      refreshThreadList();
      setActiveThreadTitle(message.slice(0, 72));
      thread.scrollTop = thread.scrollHeight;
      setChatStatus("success", "Answer ready.");
    } catch (error) {
      document.querySelector("[data-thinking-message]")?.remove();
      const stopped = stopRequested || activeController?.signal.aborted;
      setChatStatus(stopped ? "success" : "error", stopped ? "Response stopped." : chatErrorMessage(error));
    } finally {
      activeController = null;
      stopRequested = false;
      stopThinkingStatus();
      setThinkingState(false);
    }
  });
}

function renderConsultationItem(item) {
  return `<article class="card stack"><h3>${escapeHtml(item.reason || "Consultation")}</h3><p class="muted">${escapeHtml(item.appointment_status || item.status)}</p><button class="btn btn-quiet" data-session-id="${escapeHtml(item.id)}">Open room</button></article>`;
}

function bindConsultationRooms() {
  document.querySelectorAll("[data-session-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const sessionId = button.dataset.sessionId;
      await window.medRealtime?.joinConsultation(sessionId).catch(() => {});
      const response = await apiRequest(`/consultations/${sessionId}/messages`);
      const messages = response.data?.messages || [];
      document.querySelector("[data-consultation-output]").innerHTML = `<div class="stack">${messages.map((message) => `<p class="message-bubble">${escapeHtml(message.content)}</p>`).join("") || `<p class="muted">No messages yet.</p>`}</div><form class="form" data-message-form><div class="field"><label for="content">Message</label><textarea id="content" name="content" required></textarea></div><button class="btn btn-primary" type="submit">${icon("send")}Send</button></form>`;
      document.querySelector("[data-message-form]")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const content = new FormData(event.currentTarget).get("content");
        if (!window.medRealtime) throw new Error("Realtime connection is not available.");
        await window.medRealtime.sendMessage({ sessionId, content });
        button.click();
      });
    });
  });
}

function doctorName(doctor) {
  return [doctor.first_name, doctor.last_name].filter(Boolean).join(" ") || "Doctor";
}

function renderDoctorCard(doctor) {
  return `<article class="card stack"><div class="card-header"><div><h3>Dr. ${escapeHtml(doctorName(doctor))}</h3><p class="muted">${escapeHtml(doctor.specialization || doctor.specialty || "General Medicine")}</p></div><span class="badge badge-success">Verified</span></div><div class="actions"><span class="badge">${doctor.has_availability ? "Available slots" : "No slots listed"}</span><span class="badge">${doctor.consultation_fee_cents ? money(doctor.consultation_fee_cents) : "Consultation access"}</span></div><a class="btn btn-quiet" href="/doctor/${doctor.id}">View profile</a></article>`;
}

async function renderDoctors() {
  const meta = routeTitle("/doctors");
  setMain(`${pageHeader(meta)}${loadingState("Loading verified doctors")}`);
  try {
    const response = await apiRequest("/doctors");
    const doctors = response.data?.doctors || [];
    setMain(`
      <section class="patient-command">
        <section class="form-card patient-filter-card"><form class="form" data-doctor-search><div class="grid grid-3">${field("Search doctors", "q", "text", false)}${field("Specialization", "specialization", "text", false)}<div class="field"><label for="availableOnly">Availability</label><select id="availableOnly" name="availableOnly"><option value="">Any</option><option value="true">Has availability</option></select></div></div><button class="btn btn-primary" type="submit">${icon("search")}Search</button></form></section>
        <section class="grid grid-3" data-doctor-results>${doctors.length ? doctors.map(renderDoctorCard).join("") : EmptyState("stethoscope", "Doctor directory is ready", "Verified doctors will appear here after approval and availability setup.", [{ label: "Check appointments", href: "/appointments" }])}</section>
      </section>
    `);
    const searchForm = document.querySelector("[data-doctor-search]");
    const runSearch = async (form) => {
      const params = new URLSearchParams(new FormData(form));
      const filtered = await apiRequest(`/doctors?${params.toString()}`);
      document.querySelector("[data-doctor-results]").innerHTML = (filtered.data?.doctors || []).map(renderDoctorCard).join("") || EmptyState("manage_search", "Refine your doctor search", "Try a different specialty, name, or availability filter.", [{ label: "Reset search", href: "/doctors" }]);
    };
    const debouncedSearch = debounce((form) => runSearch(form).catch(() => {
      document.querySelector("[data-doctor-results]").innerHTML = errorState("We could not update doctor results", false);
    }));
    searchForm?.addEventListener("input", (event) => {
      debouncedSearch(event.currentTarget);
    });
    searchForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      await runSearch(event.currentTarget);
    });
  } catch {
    setMain(`${pageHeader(meta)}${errorState("We could not load verified doctors")}`);
  }
}

function renderJobCard(job) {
  return `<article class="card stack" data-job-card data-specialty="${escapeHtml(job.specialty || "")}">
    <div class="card-header"><div><h2>${escapeHtml(job.title)}</h2><p class="muted">${escapeHtml(job.specialty || "General practice")}</p></div><span class="badge">${escapeHtml(job.status || "published")}</span></div>
    <p class="muted">${escapeHtml(job.description || "Role details are managed by the recruitment team.")}</p>
    <button class="btn btn-secondary" type="button" data-apply-job="${escapeHtml(job.id)}">${icon("assignment")}Use this position</button>
  </article>`;
}

async function renderDoctorCareers() {
  const meta = routeTitle("/doctor-careers");
  setMain(`${pageHeader(meta)}${loadingState("Loading doctor careers")}`);
  try {
    const response = await apiRequest("/recruitment/jobs");
    const jobs = response.data?.jobs || [];
    const specializations = [...new Set(jobs.map((job) => job.specialty).filter(Boolean))].sort();
    setMain(`
      ${pageHeader(meta)}
      <section class="grid grid-3">
        ${summaryCard("Open Positions", "work", jobs.length ? `${jobs.length} active` : "No open roles", "/doctor-careers")}
        ${summaryCard("Application Review", "verified_user", "Admin reviewed", "/doctor-careers")}
        ${summaryCard("Credential Flow", "mail", "Secure email delivery", "/doctor-careers")}
      </section>
      <section class="form-card">
        <form class="form" data-career-filter>
          <div class="field"><label for="careerSpecialization">Specialization</label><select id="careerSpecialization" name="specialization"><option value="">All specializations</option>${specializations.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}</select></div>
        </form>
      </section>
      <section class="grid grid-3" data-career-jobs>${jobs.length ? jobs.map(renderJobCard).join("") : emptyState({ iconName: "work", title: "No doctor positions are open", description: "Published positions from the recruitment API appear here.", actionLabel: "", actionHref: "" })}</section>
      <section class="grid grid-2">
        <article class="form-card stack">
          <h2>Apply</h2>
          <form class="form" data-career-apply novalidate>
            <div class="form-message" data-form-message hidden></div>
            <input type="hidden" name="jobId" />
            ${field("Email address", "email", "email", true)}
            ${field("First name", "firstName", "text", true)}
            ${field("Last name", "lastName", "text", true)}
            ${field("Phone", "phone", "tel", false)}
            ${field("Medical license number", "medicalLicenseNumber", "text", true)}
            ${field("Specialization", "specialization", "text", true)}
            ${field("Years of experience", "yearsExperience", "number", true)}
            ${fileField("CV", "cv", true)}
            ${fileField("Medical license", "license", true)}
            <button class="btn btn-primary" type="submit">${icon("upload_file")}Submit application</button>
          </form>
        </article>
        <article class="form-card stack">
          <h2>Status tracking</h2>
          <form class="form" data-career-status novalidate>
            <div class="form-message" data-form-message hidden></div>
            ${field("Email address", "email", "email", true)}
            ${field("Medical license number", "medicalLicenseNumber", "text", true)}
            <button class="btn btn-secondary" type="submit">${icon("manage_search")}Check status</button>
          </form>
          <div class="stack" data-career-status-output></div>
        </article>
      </section>
    `);
    document.querySelector("[data-career-filter] select")?.addEventListener("change", (event) => {
      const selected = event.currentTarget.value.toLowerCase();
      document.querySelectorAll("[data-job-card]").forEach((card) => {
        card.hidden = Boolean(selected) && card.dataset.specialty.toLowerCase() !== selected;
      });
    });
    document.querySelectorAll("[data-apply-job]").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelector('[data-career-apply] input[name="jobId"]').value = button.dataset.applyJob;
        document.querySelector("[data-career-apply]").scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    document.querySelector("[data-career-apply]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!validateForm(form)) return;
      const body = new FormData(form);
      if (!body.get("jobId")) body.delete("jobId");
      setSubmitLoading(form, true);
      try {
        await apiRequest("/recruitment/applications", { method: "POST", body });
        showFormMessage(form, "success", "Application submitted for admin review.");
        form.reset();
      } catch {
        showFormMessage(form, "error", "We could not submit this application. Please check your files and retry.");
      } finally {
        setSubmitLoading(form, false);
      }
    });
    document.querySelector("[data-career-status]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!validateForm(form)) return;
      const output = document.querySelector("[data-career-status-output]");
      setSubmitLoading(form, true);
      try {
        const status = await apiRequest("/recruitment/applications/status", { method: "POST", body: Object.fromEntries(new FormData(form).entries()) });
        const application = status.data?.application || {};
        output.innerHTML = `<article class="card stack"><h3>${escapeHtml(application.job_title || "Doctor application")}</h3><span class="badge ${badgeClassForStatus(application.status)}">${escapeHtml(application.status || "PENDING")}</span><p class="muted">Submitted ${escapeHtml(application.created_at || "recently")}</p></article>`;
      } catch {
        output.innerHTML = errorState("We could not find that application", false);
      } finally {
        setSubmitLoading(form, false);
      }
    });
  } catch {
    setMain(`${pageHeader(meta)}${errorState("We could not load doctor careers")}`);
  }
}

async function renderDoctorProfile() {
  const id = location.pathname.split("/").pop();
  const meta = routeTitle("/doctor/:id");
  setMain(`${pageHeader(meta)}${loadingState("Loading doctor profile")}`);
  try {
    const response = await apiRequest(`/doctors/${id}`);
    const doctor = response.data?.doctor || {};
    const availability = doctor.availability || [];
    setMain(`
      ${pageHeader(meta)}
      <section class="grid grid-2">
        <article class="card card-accent stack"><div class="card-header"><div><h2>Dr. ${escapeHtml(doctorName(doctor))}</h2><p class="muted">${escapeHtml(doctor.specialization || doctor.specialty || "General Medicine")}</p></div><span class="badge badge-success">${escapeHtml(doctor.verification_status || "VERIFIED")}</span></div><p>${escapeHtml(doctor.bio || "This doctor has not added a public bio yet.")}</p><div class="actions"><span class="badge">${doctor.years_experience || 0} years experience</span><span class="badge">${doctor.consultation_fee_cents ? money(doctor.consultation_fee_cents) : "Consultation access"}</span></div></article>
        <form class="form-card form" data-appointment-form novalidate>
          <h2>Book consultation</h2>
          <div class="form-message" data-form-message hidden></div>
          <input type="hidden" name="doctorId" value="${escapeHtml(doctor.id)}" />
          <div class="field"><label for="scheduledAt">Time slot <span class="required">*</span></label><input id="scheduledAt" name="scheduledAt" type="datetime-local" required /><span class="field-error" data-error-for="scheduledAt"></span></div>
          ${textarea("Reason for visit", "reason", true)}
          ${textarea("Notes", "notes", false)}
          <button class="btn btn-primary" type="submit">${icon("calendar_add_on")}Request appointment</button>
        </form>
      </section>
      <section class="card stack"><h2>Availability Calendar</h2>${availability.length ? `<div class="actions">${availability.map((slot) => `<span class="badge">Day ${slot.day_of_week}: ${slot.starts_at} - ${slot.ends_at}</span>`).join("")}</div>` : `<p class="muted">No active availability slots are listed.</p>`}</section>
      <section class="card stack"><h2>Reviews</h2>${emptyState({ iconName: "rate_review", title: "No reviews yet", description: "Patient reviews are shown after completed consultations.", actionLabel: "", actionHref: "" })}</section>
    `);
    bindAppointmentForm();
  } catch {
    setMain(`${pageHeader(meta)}${errorState("We could not load this doctor")}`);
  }
}

async function renderAppointments() {
  const meta = routeTitle("/appointments");
  setMain(`${pageHeader(meta)}${loadingState("Loading appointments")}`);
  try {
    const response = await apiRequest("/appointments");
    const appointments = response.data?.appointments || [];
    const rows = appointments.map((appointment) => ({
      appointment: appointment.reason || "Doctor consultation",
      participant: [appointment.doctor_first_name, appointment.doctor_last_name, appointment.patient_first_name, appointment.patient_last_name].filter(Boolean).slice(0, 2).join(" ") || "Care team",
      status: displayStatus(appointment.status || "scheduled"),
      time: appointment.scheduled_at ? new Date(appointment.scheduled_at).toLocaleString() : "Scheduling"
    }));
    setMain(`
      <section class="patient-command">
        ${DataTable({ title: "Appointment queue", description: "Searchable appointment records from the backend.", rows, columns: [["appointment", "Appointment"], ["participant", "Participant"], ["status", "Status"], ["time", "Time"]], searchKey: "appointment", emptyKey: "doctors", actions: [{ label: "Find doctors", href: "/doctors", primary: true }] })}
      </section>
    `);
    bindOperationsControls();
  } catch {
    setMain(`${pageHeader(meta)}${errorState("We could not load appointments")}`);
  }
}

function bindAppointmentForm() {
  const form = document.querySelector("[data-appointment-form]");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateForm(form)) return;
    const formData = new FormData(form);
    const scheduledAt = new Date(formData.get("scheduledAt")).toISOString();
    setSubmitLoading(form, true);
    try {
      await apiRequest("/appointments", { method: "POST", body: { doctorId: formData.get("doctorId"), scheduledAt, reason: formData.get("reason"), notes: formData.get("notes") } });
      showFormMessage(form, "success", "Consultation requested. You can review appointments from the dashboard.");
    } catch {
      showFormMessage(form, "error", "We could not request that appointment. Please retry.");
    } finally {
      setSubmitLoading(form, false);
    }
  });
}
