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

  // ---- cards
  const PARTS = ["A - Introduction", "B - Unit and Lesson Planning", "C - Technology Integration", "D - Growth in Assessment Component", "E - Transformations", "F - Reflective Summary"];
  const card = (i) => `
    <li class="doc-row">
      <a class="doc-title" href="${esc(i.page)}">${esc(i.title)}</a>
      <span class="doc-tags">${i.tags.map(esc).join(" · ")}</span>
      <p>${esc(i.summary)}</p>
    </li>`;

  const stats = $("#stats");
  if (stats) {
    const cats = {}; P.items.forEach((i) => cats[i.category] = (cats[i.category] || 0) + 1);
    stats.innerHTML = `<div class="stat"><strong>${P.items.length}</strong>Documents and files</div><div class="stat"><strong>${Object.keys(cats).length} of 6</strong>Parts with content</div>`;
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
      if (list.length) {
        gallery.className = "groups";
        gallery.innerHTML = PARTS.filter((c) => list.some((i) => i.category === c)).map((c) => `<h2 class="grp">${esc(c)}</h2><ul class="doc-list">${list.filter((i) => i.category === c).map(card).join("")}</ul>`).join("");
      } else { gallery.className = ""; gallery.innerHTML = `<p class="empty">${all.length ? "Nothing matches that search." : "Documents for this part are coming soon."}</p>`; }
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
      res.innerHTML = hits.length ? `<h2 class="grp">Matching evidence</h2><ul class="doc-list">${hits.map(card).join("")}</ul>` : "";
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
    const pb = e.target.closest("[data-photo]"); if (!pb || !dlg) return;
    opener = pb;
    $("#detailBody").innerHTML = `<img class="dlg-img" src="${esc(pb.dataset.photo)}" alt="${esc(pb.dataset.alt)}"><p class="meta">${esc(pb.dataset.cap)}</p>`;
    dlg.showModal();
  });
  $("#detailClose")?.addEventListener("click", () => dlg.close());
  dlg?.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  dlg?.addEventListener("close", () => opener?.focus());

  // ---- YouTube: load the player only when Play is pressed
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".yt-play"); if (!b) return;
    const box = b.closest(".yt"), id = box.dataset.yt;
    box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0" title="Transformations video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  });

  reveal();
})();
