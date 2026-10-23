(() => {
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safe = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };

  // theme
  const saved = safe.get("theme");
  if (saved) root.dataset.theme = saved;
  const themeBtn = $("#themeToggle");
  const isDark = () => root.dataset.theme === "dark" || (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  const paintTheme = () => { if (themeBtn) { themeBtn.textContent = isDark() ? "☀" : "☾"; themeBtn.setAttribute("aria-label", isDark() ? "Switch to light mode" : "Switch to dark mode"); } };
  paintTheme();
  themeBtn?.addEventListener("click", () => { root.dataset.theme = isDark() ? "light" : "dark"; safe.set("theme", root.dataset.theme); paintTheme(); });

  // mobile nav
  const menu = $("#menuBtn"), nav = $("#nav");
  menu?.addEventListener("click", () => { const o = nav.classList.toggle("open"); menu.setAttribute("aria-expanded", o); });

  // reading progress
  const bar = $("#progress");
  const onScroll = () => { const h = root.scrollHeight - innerHeight; if (bar) bar.style.width = h > 0 ? (scrollY / h) * 100 + "%" : "0"; };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  // reveal
  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .1 }) : null;
  const reveal = () => $$(".reveal:not(.in)").forEach((el) => io ? io.observe(el) : el.classList.add("in"));

  const P = window.PORTFOLIO; if (!P) { reveal(); return; }

  // fill owner
  $$("[data-owner]").forEach((el) => { el.textContent = P.owner[el.dataset.owner] || ""; });
  $$(".avatar").forEach((el) => { el.textContent = P.owner.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase(); });
  $$("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });

  const card = (i) => `
    <article class="card reveal${i.placeholder ? " placeholder" : ""}">
      <div><span class="tag">${esc(i.category)}</span></div>
      <h3>${esc(i.title)}</h3>
      <p class="meta">${esc(i.date)} · ${i.tags.map(esc).join(", ")}</p>
      <p>${esc(i.summary)}</p>
      <a class="more" href="#" data-open="${esc(i.id)}">View details →</a>
    </article>`;

  // stats + featured on home
  const stats = $("#stats");
  if (stats) {
    const cats = {}; P.items.forEach((i) => cats[i.category] = (cats[i.category] || 0) + 1);
    stats.innerHTML = `<div class="stat"><strong>${P.items.length}</strong>Artefacts</div>` +
      Object.entries(cats).map(([c, n]) => `<div class="stat"><strong>${n}</strong>${esc(c)}</div>`).join("");
  }
  const featured = $("#featured");
  if (featured) featured.innerHTML = P.items.slice(0, 3).map(card).join("");

  const modules = $("#modules");
  if (modules) modules.innerHTML = P.modules.map((m) => `<div class="card reveal placeholder"><span class="tag">${esc(m.code)}</span><h3>${esc(m.title)}</h3><p>${esc(m.note)}</p></div>`).join("");
  const tl = $("#timeline");
  if (tl) tl.innerHTML = P.timeline.map((t) => `<li class="reveal"><time>${esc(t.date)}</time><h3>${esc(t.title)}</h3><p>${esc(t.text)}</p></li>`).join("");

  // filterable gallery: <div id="gallery" data-category="Lesson plan"> (omit for all)
  const gallery = $("#gallery");
  if (gallery) {
    const fixed = (gallery.dataset.category || "").split(",").filter(Boolean);
    const all = P.items.filter((i) => !fixed.length || fixed.includes(i.category));
    const chipsEl = $("#chips"), q = $("#q");
    let cat = "All";
    const cats = ["All", ...new Set(all.map((i) => i.category))];
    if (chipsEl) chipsEl.innerHTML = (cats.length > 2 ? cats : []).map((c) => `<button class="chip" type="button" aria-pressed="${c === "All"}">${esc(c)}</button>`).join("");
    const draw = () => {
      const term = (q?.value || "").toLowerCase();
      const list = all.filter((i) => (cat === "All" || i.category === cat) && (i.title + i.summary + i.tags.join(" ")).toLowerCase().includes(term));
      gallery.innerHTML = list.length ? list.map(card).join("") : `<p class="empty">${all.length ? "Nothing matches that search." : "No items yet. Add one to js/data.js."}</p>`;
      reveal();
    };
    chipsEl?.addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (!b) return; cat = b.textContent; $$(".chip", chipsEl).forEach((c) => c.setAttribute("aria-pressed", c === b)); draw(); });
    q?.addEventListener("input", draw);
    draw();
  }

  // collapse section list on small screens
  const side = $("#sideBox"); if (side && matchMedia("(max-width:900px)").matches) side.open = false;

  // detail dialog
  const dlg = $("#detail");
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-open]"); if (!a || !dlg) return;
    e.preventDefault();
    const i = P.items.find((x) => x.id === a.dataset.open); if (!i) return;
    $("#detailBody").innerHTML = `<span class="tag">${esc(i.category)}</span><h2>${esc(i.title)}</h2><p class="meta">${esc(i.date)} · ${i.tags.map(esc).join(", ")}</p><p>${esc(i.detail)}</p>` +
      (i.file ? `<p><a class="btn" href="${esc(i.file)}" target="_blank" rel="noopener">Open document</a></p>` : `<p class="notice">No file attached yet. Add one to the <code>docs/</code> folder and set <code>file</code> in <code>js/data.js</code>.</p>`);
    dlg.showModal();
  });
  $("#detailClose")?.addEventListener("click", () => dlg.close());
  dlg?.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });

  reveal();
})();
