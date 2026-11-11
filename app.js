(function () {
  "use strict";

  const CFG = window.MATHATHON_CONFIG || {};
  const SURVEYS = window.SURVEYS || [];
  const app = document.getElementById("app");
  const DEMO = !CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY;
  const OTHER = "Other";

  // ---------- storage helpers (all wrapped: private mode can throw) ----------
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
    },
    del(key) {
      try { localStorage.removeItem(key); } catch { /* ignore */ }
    },
  };

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  // Anonymous id linking one person's surveys together (no personal info).
  let respondentId = store.get("mm_respondent", null);
  if (!respondentId) { respondentId = uuid(); store.set("mm_respondent", respondentId); }

  const completed = () => store.get("mm_completed", []);
  const markCompleted = (id) => {
    const list = completed();
    if (!list.includes(id)) { list.push(id); store.set("mm_completed", list); }
  };

  // ---------- tiny DOM helper ----------
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      el.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
    }
    return el;
  }

  const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="#2f8586" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  // ---------- router ----------
  function route() {
    const m = location.hash.match(/^#\/(survey|thanks)\/([\w-]+)/);
    const survey = m && SURVEYS.find((s) => s.id === m[2]);
    app.innerHTML = "";
    if (m && survey && m[1] === "survey") renderSurvey(survey);
    else if (m && survey && m[1] === "thanks") renderThanks(survey);
    else renderHome();
    window.scrollTo(0, 0);
    app.focus({ preventScroll: true });
  }
  window.addEventListener("hashchange", route);

  // ---------- home ----------
  function renderHome() {
    const done = completed();
    const nDone = SURVEYS.filter((s) => done.includes(s.id)).length;

    const cards = SURVEYS.map((s, i) => {
      const isDone = done.includes(s.id);
      return h("a", {
        href: `#/survey/${s.id}`,
        class: `card ${s.accent === "orange" ? "orange" : ""} ${isDone ? "done" : ""}`,
      },
        h("div", { class: "num", html: isDone ? CHECK_SVG.replace("#2f8586", "#fff").replace("<svg", '<svg width="20" height="20"') : String(i + 1) }),
        h("div", null, h("h2", null, s.title), h("p", null, s.blurb)),
        h("div", { class: "meta" },
          `~${s.minutes} min`,
          h("span", { class: "go" }, isDone ? "Completed" : "Start →"))
      );
    });

    app.appendChild(
      h("div", { class: "wrap" },
        h("section", { class: "hero" },
          h("span", { class: "eyebrow" }, "Mathathon Participant Survey"),
          h("h1", null, "Help us better understand ", h("span", { class: "hl" }, "Mathathon"), " participants!"),
          h("p", null, "Surveys on your demographics, educational background, and perspectives on the future of math + AI. Come by the Fuel Station (Beckman Mall) to exchange survey participation for drinks and snacks!"),
          DEMO ? h("div", { class: "banner" }, "Preview mode: Supabase isn't configured yet, so responses are saved only in this browser.") : null
        ),
        h("div", { class: "progress-summary" },
          h("div", { class: "bar" }, h("span", { style: `width:${(nDone / SURVEYS.length) * 100}%` })),
          `${nDone} of ${SURVEYS.length} completed`
        ),
        h("section", { class: "cards" }, cards)
      )
    );
  }

  // ---------- question renderers ----------
  function otherLabel(q) { return typeof q.other === "string" ? q.other : OTHER; }

  function choiceInput(q, type, value, saved) {
    const checked = type === "radio" ? saved === value : Array.isArray(saved) && saved.includes(value);
    return h("label", { class: "choice" },
      h("input", { type, name: q.id, value, checked }),
      h("span", null, value === OTHER ? otherLabel(q) : value)
    );
  }

  function renderBody(q, draft) {
    const saved = draft[q.id];
    switch (q.type) {
      case "single":
      case "multi": {
        const type = q.type === "single" ? "radio" : "checkbox";
        const opts = q.other ? [...q.options, OTHER] : q.options;
        const wrap = h("div", null, h("div", { class: "choices" }, opts.map((o) => choiceInput(q, type, o, saved))));
        if (q.other) {
          const isOn = type === "radio" ? saved === OTHER : Array.isArray(saved) && saved.includes(OTHER);
          const inp = h("input", {
            type: "text", class: `other-input ${isOn ? "show" : ""}`, name: `${q.id}_other`,
            placeholder: "Please specify", maxlength: 200, "aria-label": `${q.label}: ${otherLabel(q)}`,
          });
          inp.value = draft[`${q.id}_other`] || "";
          wrap.appendChild(inp);
        }
        return wrap;
      }
      case "scale": {
        const { min, max, minLabel, maxLabel } = q.scale;
        const nums = [];
        for (let n = min; n <= max; n++) nums.push(n);
        return h("div", null,
          h("div", { class: "scale" }, nums.map((n) =>
            h("label", { class: "choice" },
              h("input", { type: "radio", name: q.id, value: n, checked: saved === n, "aria-label": `${n}${n === min ? " – " + minLabel : n === max ? " – " + maxLabel : ""}` }),
              h("span", null, n)))),
          h("div", { class: "scale-labels" }, h("span", null, `${min} · ${minLabel}`), h("span", null, `${maxLabel} · ${max}`))
        );
      }
      case "select": {
        const sel = h("select", { name: q.id, id: `q_${q.id}` },
          h("option", { value: "" }, "Select…"),
          q.options.map((o) => h("option", { value: o, selected: saved === o }, o)));
        return sel;
      }
      case "text": {
        const inp = h("input", { type: "text", name: q.id, id: `q_${q.id}`, placeholder: q.placeholder || "", maxlength: 300, autocomplete: "off" });
        inp.value = saved || "";
        return inp;
      }
      case "textarea": {
        const max = 2000;
        const ta = h("textarea", { name: q.id, id: `q_${q.id}`, rows: q.rows || 5, maxlength: max, placeholder: q.placeholder || "Type your answer…" });
        ta.value = saved || "";
        const count = h("div", { class: "char-count" }, `${ta.value.length} / ${max}`);
        ta.addEventListener("input", () => { count.textContent = `${ta.value.length} / ${max}`; });
        return h("div", null, ta, count);
      }
      case "list": {
        const rows = h("div", { class: "list-rows" });
        const addRow = (val = "", focus = false) => {
          const inp = h("input", { type: "text", "data-list": q.id, placeholder: rows.children.length ? "Another school" : q.placeholder || "", maxlength: 200, autocomplete: "off", "aria-label": q.label });
          inp.value = val;
          inp.addEventListener("keydown", (e) => {
            if (e.key === "Enter") { e.preventDefault(); if (inp.value.trim()) addRow("", true); }
          });
          const row = h("div", { class: "list-row" }, inp,
            h("button", {
              type: "button", class: "icon-btn", "aria-label": "Remove", title: "Remove",
              onclick: () => { if (rows.children.length > 1) row.remove(); else inp.value = ""; rows.dispatchEvent(new Event("input", { bubbles: true })); },
            }, "×"));
          rows.appendChild(row);
          if (focus) inp.focus();
        };
        const vals = Array.isArray(saved) && saved.length ? saved : [""];
        vals.forEach((v) => addRow(v));
        return h("div", null, rows, h("button", { type: "button", class: "add-btn", onclick: () => addRow("", true) }, "+ Add another"));
      }
    }
    return null;
  }

  function renderQuestion(q, idx, draft) {
    const grouped = ["single", "multi", "scale", "list"].includes(q.type);
    const title = [`${idx + 1}. ${q.label}`, q.required ? h("span", { class: "req", "aria-hidden": "true" }, "*") : null];
    const hint = q.hint ? h("p", { class: "hint" }, q.hint) : null;
    const body = h("div", { class: "q-body" }, renderBody(q, draft));
    const err = h("div", { class: "error-msg", role: "alert" }, "");

    if (grouped) {
      return h("fieldset", { class: "q", "data-q": q.id, "aria-required": q.required ? "true" : null },
        h("legend", null, title), hint, body, err);
    }
    return h("div", { class: "q", "data-q": q.id },
      h("label", { class: "label", for: `q_${q.id}` }, title), hint, body, err);
  }

  // ---------- read / validate ----------
  function readAnswers(form, survey) {
    const fd = new FormData(form);
    const out = {};
    for (const q of survey.questions) {
      let v;
      if (q.type === "multi") v = fd.getAll(q.id);
      else if (q.type === "scale") v = fd.get(q.id) ? Number(fd.get(q.id)) : null;
      else if (q.type === "list") v = [...form.querySelectorAll(`[data-list="${q.id}"]`)].map((i) => i.value.trim()).filter(Boolean);
      else v = (fd.get(q.id) || "").toString().trim();
      out[q.id] = v;
      if (q.other) {
        const usesOther = Array.isArray(v) ? v.includes(OTHER) : v === OTHER;
        if (usesOther) out[`${q.id}_other`] = (fd.get(`${q.id}_other`) || "").toString().trim();
      }
    }
    return out;
  }

  const isEmpty = (v) => v == null || v === "" || (Array.isArray(v) && v.length === 0);

  function validate(form, survey, answers) {
    let first = null;
    for (const q of survey.questions) {
      const box = form.querySelector(`[data-q="${q.id}"]`);
      let msg = "";
      if (q.required && isEmpty(answers[q.id])) msg = "Please answer this question.";
      else if (q.max && Array.isArray(answers[q.id]) && answers[q.id].length > q.max) msg = `Please choose at most ${q.max}.`;
      else if (q.other && `${q.id}_other` in answers && !answers[`${q.id}_other`]) msg = "Please fill in your answer for “" + otherLabel(q) + "”.";
      box.classList.toggle("invalid", !!msg);
      box.querySelector(".error-msg").textContent = msg;
      if (msg && !first) first = box;
    }
    return first;
  }

  // ---------- survey page ----------
  function renderSurvey(survey) {
    const draftKey = `mm_draft_${survey.id}`;
    const draft = store.get(draftKey, {});
    const fill = h("span");
    const progressText = h("span", null, "");

    const submitBtn = h("button", { type: "submit", class: "btn btn-primary" }, "Submit responses");
    const formErr = h("span", { class: "form-error", role: "alert" });

    const form = h("form", { novalidate: true },
      survey.questions.map((q, i) => renderQuestion(q, i, draft)),
      h("div", { class: "actions" }, submitBtn, formErr)
    );

    const updateProgress = () => {
      const a = readAnswers(form, survey);
      const answered = survey.questions.filter((q) => !isEmpty(a[q.id])).length;
      fill.style.width = `${(answered / survey.questions.length) * 100}%`;
      progressText.textContent = `${answered} / ${survey.questions.length}`;
      return a;
    };

    const onChange = (e) => {
      // show / hide "other" text boxes and enforce max selections
      const t = e.target;
      if (t.name && (t.type === "radio" || t.type === "checkbox")) {
        const q = survey.questions.find((x) => x.id === t.name);
        if (q && q.other) {
          const box = form.querySelector(`[name="${q.id}_other"]`);
          box.classList.toggle("show", form.querySelector(`input[name="${q.id}"][value="${OTHER}"]`).checked);
          if (box.classList.contains("show") && t.value === OTHER && t.checked) box.focus();
        }
        if (q && q.max) {
          const boxes = [...form.querySelectorAll(`input[name="${q.id}"]`)];
          const n = boxes.filter((b) => b.checked).length;
          boxes.forEach((b) => { b.disabled = !b.checked && n >= q.max; });
        }
      }
      const box = t.closest && t.closest(".q.invalid");
      if (box) { box.classList.remove("invalid"); }
      store.set(draftKey, updateProgress());
    };
    form.addEventListener("input", onChange);
    form.addEventListener("change", onChange);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      formErr.textContent = "";
      const answers = readAnswers(form, survey);
      const bad = validate(form, survey, answers);
      if (bad) {
        bad.scrollIntoView({ behavior: "smooth", block: "center" });
        formErr.textContent = "Some questions need an answer.";
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting…";
      try {
        await submit(survey.id, answers);
        store.del(draftKey);
        markCompleted(survey.id);
        location.hash = `#/thanks/${survey.id}`;
      } catch (err) {
        console.error(err);
        formErr.textContent = "Couldn't submit. Please check your connection and try again.";
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit responses";
      }
    });

    app.appendChild(
      h("div", { class: "wrap" },
        h("div", { class: "survey-head" },
          h("a", { href: "#/", class: "back" }, "← All surveys"),
          h("h1", null, survey.title),
          h("p", null, `${survey.blurb} Only questions marked `, h("span", { class: "req" }, "*"), ` are required.`)
        ),
        h("div", { class: "sticky-progress" }, h("div", { class: "bar" }, fill), progressText),
        form
      )
    );

    // Apply max-selection disabling for restored drafts.
    survey.questions.filter((q) => q.max).forEach((q) => {
      const boxes = [...form.querySelectorAll(`input[name="${q.id}"]`)];
      const n = boxes.filter((b) => b.checked).length;
      boxes.forEach((b) => { b.disabled = !b.checked && n >= q.max; });
    });
    updateProgress();
  }

  // ---------- submit to Supabase (REST, no SDK needed) ----------
  async function submit(surveyId, answers) {
    const row = {
      survey: surveyId,
      respondent_id: respondentId,
      answers,
      user_agent: navigator.userAgent.slice(0, 300),
    };

    if (DEMO) {
      const saved = store.get("mm_demo_responses", []);
      saved.push({ ...row, created_at: new Date().toISOString() });
      store.set("mm_demo_responses", saved);
      console.info("[preview mode] response saved locally:", row);
      await new Promise((r) => setTimeout(r, 400));
      return;
    }

    const key = CFG.SUPABASE_ANON_KEY;
    const headers = {
      "Content-Type": "application/json",
      apikey: key,
      Prefer: "return=minimal",
    };
    // Legacy anon keys are JWTs and go in Authorization too; new publishable keys don't.
    if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;

    const url = `${CFG.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${CFG.TABLE || "responses"}`;
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(row) });
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  }

  // ---------- thank-you ----------
  function renderThanks(survey) {
    const done = completed();
    const next = SURVEYS.find((s) => !done.includes(s.id));
    app.appendChild(
      h("div", { class: "wrap" },
        h("section", { class: "thanks" },
          h("div", { class: "check", html: CHECK_SVG }),
          h("h1", null, "Thank you!"),
          h("p", null, next
            ? `Your “${survey.title}” responses were recorded. Have a few more minutes? Try the next one.`
            : "You've completed every survey. Thanks for helping shape Caltech Mathathon!"),
          h("div", { class: "actions" },
            next ? h("a", { href: `#/survey/${next.id}`, class: "btn btn-primary" }, `Next: ${next.title} →`) : null,
            h("a", { href: "#/", class: "btn btn-secondary" }, "Back to all surveys")
          )
        )
      )
    );
  }

  route();
})();
