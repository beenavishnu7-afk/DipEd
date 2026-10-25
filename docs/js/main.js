(() => {
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} }
  };

  // ---- display preferences: theme and text size
  const isDark = () => root.dataset.theme === "dark" || (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  const themeBtn = $("#themeToggle");
  const paintTheme = () => { if (!themeBtn) return; themeBtn.textContent = isDark() ? "☀" : "☾"; themeBtn.setAttribute("aria-label", isDark() ? "Switch to light mode" : "Switch to dark mode"); };
  paintTheme();
  themeBtn?.addEventListener("click", () => { root.dataset.theme = isDark() ? "light" : "dark"; store.set("theme", root.dataset.theme); paintTheme(); });

  let level = Math.max(-1, Math.min(3, +store.get("textLevel") || 0));
  const setLevel = (n) => { level = Math.max(-1, Math.min(3, n)); root.style.fontSize = (100 + level * 10) + "%"; store.set("textLevel", level); };
  $("#textUp")?.addEventListener("click", () => setLevel(level + 1));
  $("#textDown")?.addEventListener("click", () => setLevel(level - 1));

  // ---- mobile nav
  const menu = $("#menuBtn"), nav = $("#nav");
  menu?.addEventListener("click", () => { const o = nav.classList.toggle("open"); menu.setAttribute("aria-expanded", o); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && nav?.classList.contains("open")) { nav.classList.remove("open"); menu.setAttribute("aria-expanded", "false"); menu.focus(); } });

  // ---- reading progress bar
  const bar = $("#progress");
  const onScroll = () => { const h = root.scrollHeight - innerHeight; if (bar) bar.style.width = h > 0 ? (scrollY / h) * 100 + "%" : "0"; };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  // ---- reveal on scroll
  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .08 }) : null;
  const reveal = () => $$(".reveal:not(.in)").forEach((el) => io ? io.observe(el) : el.classList.add("in"));

  const P = window.PORTFOLIO;
  if (!P) { reveal(); return; }

  // ---- owner details
  $$("[data-owner]").forEach((el) => { el.textContent = P.owner[el.dataset.owner] || ""; });
  $$("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
  const mail = $("#mailBtn"); if (mail && P.owner.email) { mail.href = "mailto:" + P.owner.email; mail.textContent = P.owner.email; }

  // ---- section progress (stored only in this browser)
  const TOTAL = $$(".side-box li").length || +($("#progMeter")?.getAttribute("aria-valuemax")) || 15;
  const getDone = () => { try { return JSON.parse(store.get("done")) || []; } catch { return []; } };
  const paintDone = () => {
    const done = getDone();
    $$("[data-tick]").forEach((el) => { const on = done.includes(el.dataset.tick); if (el.classList.contains("done-flag")) el.hidden = !on; else el.classList.toggle("on", on); });
    const slug = document.body.dataset.slug, btn = $("[data-done]");
    if (btn && slug) { const on = done.includes(slug); btn.setAttribute("aria-pressed", on); btn.textContent = on ? "✓ Marked as read (click to undo)" : "Mark section as read"; }
    const fill = $("#progFill"), meter = $("#progMeter"), txt = $("#progText");
    if (fill) { fill.style.width = (done.length / TOTAL) * 100 + "%"; meter.setAttribute("aria-valuenow", done.length); txt.textContent = `${done.length} of ${TOTAL} sections marked as read`; }
  };
  $("[data-done]")?.addEventListener("click", (e) => {
    const slug = e.currentTarget.dataset.done, done = getDone(), i = done.indexOf(slug);
    if (i >= 0) done.splice(i, 1); else done.push(slug);
    store.set("done", JSON.stringify(done)); paintDone();
  });
  paintDone();

  // ---- cards
  const CAT_IMG = { "Purpose Statement": "purpose-statement", "Philosophy": "initial-philosophy", "Unit of instruction": "sample-unit", "Lesson plan": "lesson-plans", "Task analysis": "task-analysis", "Scaffolding": "instructional-scaffolding", "Peer discussion": "peer-discussion", "Technology": "technology", "Performance assessment": "performance-assessment", "Classroom assessment": "classroom-assessment", "Curriculum integration": "curriculum-integration", "Adaptation": "adaptation-to-change", "Instructional objectives": "instructional-objectives", "Reflection": "reflective-summary", "Teaching practice": "teaching-practice" };
  const card = (i) => `
    <article class="card reveal${i.placeholder ? " placeholder" : ""}">
      ${i.thumb ? `<img class="thumb photo" src="${esc(i.thumb)}" alt="" width="640" height="480" loading="lazy" decoding="async">` : CAT_IMG[i.category] ? `<img class="thumb" src="assets/img/${CAT_IMG[i.category]}.svg" alt="" width="640" height="360" loading="lazy" decoding="async">` : ""}
      <div><span class="tag">${esc(i.category)}</span></div>
      <h3>${esc(i.title)}</h3>
      <p class="meta">${i.date ? esc(i.date) + " · " : ""}${i.tags.map(esc).join(", ")}</p>
      <p>${esc(i.summary)}</p>
      <a class="more" href="#" data-open="${esc(i.id)}">View details →</a>
    </article>`;

  const stats = $("#stats");
  if (stats) {
    const cats = {}; P.items.forEach((i) => cats[i.category] = (cats[i.category] || 0) + 1);
    stats.innerHTML = `<div class="stat"><strong>${P.items.length}</strong>Artefacts</div><div class="stat"><strong>${Object.keys(cats).length}</strong>Categories</div>`;
  }
  const featured = $("#featured");
  if (featured) featured.innerHTML = P.items.slice(0, 3).map(card).join("");

  // ---- gallery with search and filters
  const gallery = $("#gallery");
  if (gallery) {
    const fixed = (gallery.dataset.category || "").split(",").filter(Boolean);
    const all = P.items.filter((i) => !fixed.length || fixed.includes(i.category));
    const chipsEl = $("#chips"), q = $("#q"), count = $("#count");
    let cat = "All";
    const cats = ["All", ...new Set(all.map((i) => i.category))];
    if (chipsEl) chipsEl.innerHTML = (cats.length > 2 ? cats : []).map((c) => `<button class="chip" type="button" aria-pressed="${c === "All"}">${esc(c)}</button>`).join("");
    const draw = () => {
      const term = (q?.value || "").toLowerCase();
      const list = all.filter((i) => (cat === "All" || i.category === cat) && (i.title + i.summary + i.tags.join(" ")).toLowerCase().includes(term));
      gallery.innerHTML = list.length ? list.map(card).join("") : `<p class="empty">${all.length ? "Nothing matches that search." : "Documents for this section are coming soon."}</p>`;
      if (count) count.textContent = `${list.length} item${list.length === 1 ? "" : "s"} shown`;
      reveal();
    };
    chipsEl?.addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (!b) return; cat = b.textContent; $$(".chip", chipsEl).forEach((c) => c.setAttribute("aria-pressed", c === b)); draw(); });
    q?.addEventListener("input", draw);
    if (!all.length) { const t = gallery.closest("section")?.querySelector(".tools"); if (t) t.hidden = true; }
    draw();
  }

  // ---- contents page search (sections + evidence)
  const tocSearch = $("#tocSearch");
  if (tocSearch) {
    const rows = $$("#tocList li"), res = $("#tocResults"), cnt = $("#tocCount");
    const run = () => {
      const term = tocSearch.value.trim().toLowerCase();
      let shown = 0;
      rows.forEach((li) => { const m = !term || li.textContent.toLowerCase().includes(term); li.hidden = !m; if (m) shown++; });
      const hits = term ? P.items.filter((i) => (i.title + i.summary + i.category + i.tags.join(" ")).toLowerCase().includes(term)) : [];
      res.innerHTML = hits.length ? `<h2 style="grid-column:1/-1">Matching evidence</h2>` + hits.map(card).join("") : "";
      cnt.textContent = `${shown} section${shown === 1 ? "" : "s"} and ${hits.length} evidence item${hits.length === 1 ? "" : "s"} match`;
      reveal();
    };
    tocSearch.addEventListener("input", run);
  }

  // ---- collapse section list on small screens
  const side = $("#sideBox"); if (side && matchMedia("(max-width:900px)").matches) side.open = false;

  // ---- detail dialog
  const dlg = $("#detail"); let opener = null;
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-open]"); if (!a || !dlg) return;
    e.preventDefault(); opener = a;
    const i = P.items.find((x) => x.id === a.dataset.open); if (!i) return;
    $("#detailBody").innerHTML = `<span class="tag">${esc(i.category)}</span><h2>${esc(i.title)}</h2><p class="meta">${i.date ? esc(i.date) + " · " : ""}${i.tags.map(esc).join(", ")}</p><p>${esc(i.detail)}</p>` +
      (/\.(jpe?g|png)$/i.test(i.file || "") ? `<p><img class="dlg-img" src="${esc(i.file)}" alt="${esc(i.title)}"></p>` : "") +
      (i.file ? (() => { const f = i.file, img = /\.(jpe?g|png)$/i.test(f), media = /\.(mp4|m4a)$/i.test(f); return `<p><a class="btn" href="${esc(f)}" ${img || media ? "" : "download"} target="_blank" rel="noopener">${img ? "Open full-size photo" : media ? "Play or open file" : "Download document"}</a></p>`; })() : "");
    dlg.showModal();
  });
  document.addEventListener("click", (e) => {
    const pb = e.target.closest("[data-photo]"); if (!pb || !dlg) return;
    opener = pb;
    $("#detailBody").innerHTML = `<img class="dlg-img" src="${esc(pb.dataset.photo)}" alt="${esc(pb.dataset.alt)}"><p class="meta">${esc(pb.dataset.cap)}</p>`;
    dlg.showModal();
  });
  $("#detailClose")?.addEventListener("click", () => dlg.close());
  dlg?.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  dlg?.addEventListener("close", () => opener?.focus());

  reveal();
})();
