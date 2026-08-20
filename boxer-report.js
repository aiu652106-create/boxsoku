(function () {
  "use strict";

  const root = document.querySelector("[data-boxer-report]");
  if (!root) return;

  const form = root.querySelector(".boxer-report-form");
  const field = root.querySelector("[name=fieldName]");
  const current = root.querySelector("[data-report-current]");
  const status = root.querySelector("[data-report-status]");
  const submit = form?.querySelector("button[type=submit]");
  if (!form || !field || !current || !status || !submit) return;

  let currentValues = {};
  try {
    currentValues = JSON.parse(root.dataset.currentValues || "{}");
  } catch {
    currentValues = {};
  }

  function updateCurrentValue() {
    current.textContent = `現在表示：${currentValues[field.value] || "不明"}`;
  }

  field.addEventListener("change", updateCurrentValue);
  updateCurrentValue();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const proposedValue = String(form.elements.proposedValue.value || "").trim();
    const evidenceUrl = String(form.elements.evidenceUrl.value || "").trim();
    const comment = String(form.elements.comment.value || "").trim();

    if (!proposedValue || !/^https?:\/\//i.test(evidenceUrl)) {
      status.textContent = "変更候補と根拠URLを入力してください。";
      status.classList.add("is-error");
      return;
    }

    submit.disabled = true;
    status.classList.remove("is-error");
    status.textContent = "送信しています…";
    try {
      const response = await fetch("/api/boxer-reports", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fighterId: root.dataset.fighterId,
          fieldName: field.value,
          proposedValue,
          evidenceUrl,
          comment,
          website: String(form.elements.website.value || "")
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) {
        throw new Error(result.message || "報告を送信できませんでした。");
      }
      form.reset();
      updateCurrentValue();
      status.textContent = result.message || "報告を受け付けました。";
    } catch (error) {
      status.textContent = error.message;
      status.classList.add("is-error");
    } finally {
      submit.disabled = false;
    }
  });
})();
