/**
 * @file Report upload, extraction, analysis, and detail pages.
 * @module assets/js/pages/reports.js
 */

// -----------------------------------------------------------------------------
// Report upload, extraction, analysis, and detail pages.
// -----------------------------------------------------------------------------

async function renderReports() {
  const meta = routeTitle("/reports");
  setMain(`${pageHeader(meta)}${loadingState("Loading reports")}`);
  try {
    const [response, subscription] = await Promise.allSettled([cachedRequest("reports", "/reports"), cachedRequest("subscription", "/subscriptions/me")]);
    const reports = response.value?.data?.reports || [];
    setMain(`
      ${pageHeader(meta)}
      ${renderEntitlementBanner(subscription.value?.data || {}, "reportAnalysis")}
      <section class="form-card">
        <form class="form" data-upload-form novalidate>
          <div class="form-message" data-form-message hidden></div>
          ${field("Report title", "title", "text", false)}
          <div class="field"><label for="report">Medical report file <span class="required">*</span></label><input id="report" name="report" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" required /><span class="field-error" data-error-for="report"></span></div>
          <button class="btn btn-primary" type="submit">${icon("upload_file")}Upload securely</button>
        </form>
      </section>
      <section class="stack"><h2>Report library</h2>${listCard(reports, { iconName: "description", title: "No reports uploaded", description: "Upload a report to create your first secure report record.", actionLabel: "Choose a file", actionHref: "/reports" }, renderReportItem)}</section>
    `);
    bindUploadForm();
  } catch {
    setMain(`${pageHeader(meta)}${errorState("We could not load reports")}`);
  }
}

function bindUploadForm() {
  const form = document.querySelector("[data-upload-form]");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateForm(form)) return;
    const formData = new FormData(form);
    setSubmitLoading(form, true);
    try {
      await apiRequest("/reports", { method: "POST", body: formData });
      showFormMessage(form, "success", "Report uploaded. Your library is refreshing.");
      state.dataCache.delete("reports");
      window.setTimeout(renderReports, 500);
    } catch {
      showFormMessage(form, "error", "We could not upload that report. Please retry or contact support.");
    } finally {
      setSubmitLoading(form, false);
    }
  });
}

function renderExtractionProgress(report) {
  const status = report.extraction_status || "pending";
  const started = report.extraction_started_at ? new Date(report.extraction_started_at).toLocaleString() : "Not started";
  const completed = report.extraction_completed_at ? new Date(report.extraction_completed_at).toLocaleString() : "Not completed";
  return `<section class="card stack">
    <div class="card-header">
      <div><h2>Processing Status</h2><p class="muted">OCR and medical extraction state for this report.</p></div>
      <span class="badge ${badgeClassForStatus(status)}">${escapeHtml(displayStatus(status))}</span>
    </div>
    <section class="metric-grid">
      ${metricTile("Confidence", "verified", confidenceText(report.analysis_confidence))}
      ${metricTile("Started", "hourglass_top", started)}
      ${metricTile("Completed", "task_alt", completed)}
      ${metricTile("Version", "settings_suggest", report.processing_version || "Not set")}
    </section>
    ${report.extraction_error ? `<p class="form-message" data-state="error" role="alert">${escapeHtml(report.extraction_error)}</p>` : ""}
  </section>`;
}

function renderEntityChips(report) {
  const entities = report.medical_entities_json || {};
  const groups = [
    ["Diseases", entities.diseases],
    ["Conditions", entities.conditions],
    ["Medications", entities.medications],
    ["Symptoms", entities.symptoms],
    ["Biomarkers", entities.biomarkers],
    ["Test Names", entities.testNames || entities.test_names],
    ["Units", entities.units]
  ];
  const content = groups
    .filter(([, values]) => values?.length)
    .map(([, values]) => values.map((value) => `<span class="badge">${escapeHtml(value)}</span>`).join(""))
    .join("");
  return `<section class="card stack"><h2>Medical Findings</h2>${content ? `<div class="actions">${content}</div>` : `<p class="muted">No structured medical entities were detected yet.</p>`}</section>`;
}

function renderLabValuesTable(labResults = []) {
  if (!labResults.length) {
    return `<section class="card stack"><h2>Lab Values</h2>${emptyState({ iconName: "science", title: "No lab values detected", description: "Values appear here after OCR detects structured test results.", actionLabel: "", actionHref: "" })}</section>`;
  }

  const rows = labResults
    .map(
      (result) => `<tr>
        <td>${escapeHtml(result.testName || "Test")}</td>
        <td>${escapeHtml(result.value ?? "")}</td>
        <td>${escapeHtml(result.unit || "")}</td>
        <td>${escapeHtml([result.referenceMin, result.referenceMax].filter((value) => value !== null && value !== undefined).join(" - ") || "Not detected")}</td>
        <td><span class="badge ${badgeClassForLabFlag(result.flag)}">${escapeHtml(result.flag || "UNKNOWN")}</span></td>
      </tr>`
    )
    .join("");
  return `<section class="table-card stack"><h2>Lab Values</h2><div class="table-wrap"><table><thead><tr><th>Test</th><th>Value</th><th>Unit</th><th>Reference Range</th><th>Flag</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

function renderListSection(title, values = [], iconName = "fact_check") {
  if (!values.length) return "";
  return `<section class="card stack"><div class="icon-tile">${icon(iconName)}</div><h2>${escapeHtml(title)}</h2><ul class="clean-list">${values.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul></section>`;
}

function renderSources(sources = []) {
  if (!sources.length) return `<section class="card stack"><h2>Sources Used</h2><p class="muted">No trusted retrieval sources were attached to this analysis.</p></section>`;
  return `<section class="card stack"><h2>Sources Used</h2><div class="stack">${sources
    .map((source) => `<a class="source-link" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer"><strong>${escapeHtml(source.title || source.source || "Trusted source")}</strong><span>${escapeHtml(source.source || source.url)}</span></a>`)
    .join("")}</div></section>`;
}

function renderAnalysisResponse(report) {
  const analysis = report.analysis?.response || null;
  if (!analysis) {
    return `<section data-analysis-target>${emptyState({ iconName: "psychology", title: "No AI summary yet", description: report.extraction_status === "completed" ? "Start analysis to generate a clear explanation from extracted content." : "Analysis unlocks after report content is extracted reliably.", actionLabel: "", actionHref: "" })}</section>`;
  }
  return `<section data-analysis-target class="stack-lg">
    <article class="card card-accent stack">
      <div class="card-header"><div><h2>AI Summary</h2><p class="muted">${escapeHtml(analysis.confidenceWarning || "Generated from extracted report content and trusted retrieval context.")}</p></div><span class="badge ${badgeClassForStatus(analysis.urgencyLevel)}">${escapeHtml(analysis.urgencyLevel || "LOW")}</span></div>
      <p>${escapeHtml(analysis.summary)}</p>
      ${analysis.seekMedicalAttention ? `<p class="form-message" data-state="error" role="alert">This analysis recommends timely review with a qualified medical professional.</p>` : ""}
    </article>
    ${renderListSection("Key Findings", analysis.keyFindings, "fact_check")}
    ${renderLabValuesTable(analysis.abnormalResults || [])}
    ${renderListSection("Possible Explanations", analysis.possibleExplanations, "psychology")}
    ${renderListSection("Recommended Questions", analysis.recommendedQuestions, "forum")}
    ${renderSources(analysis.sourcesUsed)}
  </section>`;
}

function renderAiProgress() {
  return `<section class="card stack" data-ai-progress-card hidden><div class="card-header"><div><h2>AI Processing</h2><p class="muted" data-ai-progress-text>Waiting for analysis to start.</p></div><span class="badge" data-ai-progress-value>0%</span></div><div class="meter-track"><span data-ai-progress-bar style="width:0%"></span></div></section>`;
}

async function renderReportDetail() {
  const id = location.pathname.split("/").pop();
  const meta = routeTitle("/report/:id");
  if (!id || id === ":id") {
    setMain(`${pageHeader(meta)}${emptyState({ iconName: "description", title: "No report selected", description: "Choose a report from your library to review details.", actionLabel: "Open reports", actionHref: "/reports" })}`);
    return;
  }
  setMain(`${pageHeader(meta)}${loadingState("Loading report")}`);
  try {
    const [response, subscription] = await Promise.all([apiRequest(`/reports/${id}`), cachedRequest("subscription", "/subscriptions/me").catch(() => ({ data: {} }))]);
    const report = response.data?.report || response.data;
    const canAnalyze = report.extraction_status === "completed";
    setMain(`${pageHeader(meta)}
      ${renderEntitlementBanner(subscription.data || {}, "reportAnalysis")}
      <article class="card card-accent stack">
        <div class="card-header"><div><h2>${escapeHtml(reportTitle(report))}</h2><p class="muted">${escapeHtml(report.original_name || report.mime_type || "Uploaded report")}</p></div><span class="badge ${badgeClassForStatus(report.status)}">${escapeHtml(displayStatus(report.status || "uploaded"))}</span></div>
        <div class="actions"><button class="btn btn-primary" data-action="analyze-report" ${canAnalyze ? "" : "disabled"}>${icon("auto_awesome")}Analyze report</button><a class="btn btn-secondary" href="/reports">Back to reports</a></div>
      </article>
      ${renderAiProgress()}
      ${renderExtractionProgress(report)}
      ${renderEntityChips(report)}
      ${renderLabValuesTable(report.lab_results_json || [])}
      ${renderAnalysisResponse(report)}`);
    document.querySelector('[data-action="analyze-report"]')?.addEventListener("click", async (event) => {
      event.currentTarget.disabled = true;
      try {
        const analyzed = await apiRequest(`/reports/${id}/analyze`, { method: "POST" });
        const updatedReport = analyzed.data?.report || {};
        document.querySelector("[data-analysis-target]").outerHTML = renderAnalysisResponse({ ...report, ...updatedReport });
      } catch (error) {
        const message = error?.message === "Report content could not be extracted reliably." ? error.message : "We could not start analysis";
        document.querySelector("[data-analysis-target]").innerHTML = errorState(message, false);
      }
    });
  } catch {
    setMain(`${pageHeader(meta)}${errorState("We could not load this report")}`);
  }
}
