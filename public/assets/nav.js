/* =========================================================
   KEYS TO THE RACE: shared top bar, page header and footer
   (luxury edition). Change the name, tabs, Ko-fi link or the
   "Last updated" line here once and every page updates.

   On each page:
     <header class="nav" data-nav data-root="../" data-active="candidates"></header>
     <div data-head> …page title, subtitle… </div>   (site name + updated line get added)
     <footer data-footer data-root="../"></footer>

   Theme: dark is the default. The sun/moon button switches to
   light and the choice is remembered on that device. Add
   ?theme=light or ?theme=dark to a URL to preview either one.
   ========================================================= */
window.SITE = {
  name: "Keys to the Race",
  brandHTML: "Keys <em>to the</em> Race",
  domain: "KeysToTheRace.com",
  descriptor: "Election data, from the Florida Keys to the White House.",
  tagline: "The keys to every race, vote and candidate.",
  updated: "Last updated on November 20th, 2026",
  kofi: "https://ko-fi.com/jaysonfras",
  creator: "Jayson Frascatore",
  sources: "Polls: AtlasIntel, McLaughlin & Associates via PollCheck, RealClearPolling and USA Today",
  nav: [
    { id: "home",       label: "Home",             href: "home/" },
    { id: "candidates", label: "Key Candidates",   href: "candidates/" },
    { id: "polls",      label: "Key Polls",        href: "polls/" },
    { id: "races",      label: "Key Races",        href: "races/" },
    { id: "matchups",   label: "Key Matchups",     href: "matchups/" },
    { id: "tools",      label: "Key Tools",        href: "tools/" },
    { id: "legislation", label: "Key Legislation", href: "legislation/" },
    { id: "dates",      label: "Key Dates",        href: "dates/" },
    { id: "florida",    label: "The Florida Keys", href: "florida/" },
    { id: "collection", label: "The Collection",   href: "collection/" }
  ],
  // The three line menu next to Home
  menu: [
    { id: "methodology", label: "Methodology", href: "methodology/", note: "How every number is built" },
    { id: "contact",     label: "Contact",     href: "contact/",     note: "For press and questions" },
    { id: "press",       label: "In the News", href: "press/",       note: "Coverage of the site" }
  ]
};

/* Theme helpers (the head of each page sets the starting theme before paint) */
window.setTheme = function (t, quiet) {
  const h = document.documentElement;
  h.dataset.theme = t;
  h.classList.toggle("dark", t === "dark");          // page styles still key off html.dark
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute("content", t === "dark" ? "#0b0a08" : "#f8faf9");
  try { localStorage.setItem("ktr-theme", t); } catch (e) {}
  document.dispatchEvent(new CustomEvent("themechange", { detail: t }));
  // In the all-in-one file, tell the other pages so they switch too
  if (!quiet && window.parent !== window) try { window.parent.postMessage({ ktr: "theme", t }, "*"); } catch (e) {}
};

(function () {
  const S = window.SITE;
  // Folders open their index.html on a live server; opened from a computer (file://) they don't.
  const local = location.protocol === "file:";
  // A standalone single-file copy maps tabs to its sibling files (see tools/build_standalone.py)
  const page = (root, href) => window.STANDALONE_LINKS
    ? (window.STANDALONE_LINKS[href] || window.STANDALONE_OTHER || root + href)
    : root + href + (local && (href === "" || href.endsWith("/")) ? "index.html" : "");
  window.pageLink = page;

  const KEY = `<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="kg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--k1)"/><stop offset=".5" style="stop-color:var(--k2)"/><stop offset="1" style="stop-color:var(--k3)"/></linearGradient></defs><circle cx="10" cy="16" r="6.4" fill="none" stroke="url(#kg)" stroke-width="2.4"/><circle cx="10" cy="16" r="2.2" fill="url(#kg)"/><path d="M16.4 16H29.5M23 16v4.6M27 16v3.4" stroke="url(#kg)" stroke-width="2.4" stroke-linecap="round"/></svg>`;
  const SUN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>`;
  const MOON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z"/></svg>`;
  const MENU = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`;
  const CAMERA = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;
  const CUP = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>`;

  /* ---------- Top bar ---------- */
  let root = "./";
  document.querySelectorAll("[data-nav]").forEach(el => {
    root = el.dataset.root || "./";
    const active = el.dataset.active || "";
    el.innerHTML = `
      <div class="wrap topbar" data-noshot>
        <a class="brand" href="${page(root, "")}" aria-label="${S.name} home">${KEY}<span class="brand-word">${S.brandHTML}</span></a>
        <div class="navrow">
          <div class="menu ${S.menu.some(m => m.id === active) ? "here" : ""}" id="siteMenu">
            <button class="menu-btn" type="button" aria-expanded="false" aria-controls="siteMenuPanel" aria-label="More: Methodology, Contact, In the News">${MENU}</button>
            <div class="menu-panel" id="siteMenuPanel">
              ${S.menu.map(m => `<a class="${m.id === active ? "on" : ""}" href="${page(root, m.href)}"><b>${m.label}</b><span>${m.note}</span></a>`).join("")}
              <p class="menu-by">Created by ${S.creator}</p>
            </div>
          </div>
          <nav class="navlinks" aria-label="Sections">
            ${S.nav.map(n => `<a class="${n.id === active ? "on" : ""}" href="${page(root, n.href)}" ${n.id === active ? 'aria-current="page"' : ""}>${n.label}</a>`).join("")}
          </nav>
        </div>
        <button class="icon-btn" id="themeBtn" type="button"></button>
        <button class="icon-btn" id="shotBtn" type="button" aria-label="Take a screenshot of this page" title="Screenshot">${CAMERA}</button>
      </div>`;
    const links = el.querySelector(".navlinks"), on = el.querySelector(".navlinks .on");
    // Only scroll the row when the current page's link would be cut off
    if (links && on) {
      const l = on.getBoundingClientRect(), r = links.getBoundingClientRect();
      if (l.right > r.right || l.left < r.left) links.scrollLeft += l.left - r.left - 16;
    }
  });

  // The menu opens on hover with a mouse, and on tap or Enter everywhere else
  const menu = document.getElementById("siteMenu");
  if (menu) {
    const btn = menu.querySelector(".menu-btn");
    const set = open => { menu.classList.toggle("open", open); btn.setAttribute("aria-expanded", open); };
    btn.addEventListener("click", e => { e.stopPropagation(); set(!menu.classList.contains("open")); });
    document.addEventListener("click", e => { if (!menu.contains(e.target)) set(false); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") { set(false); } });
    menu.addEventListener("mouseenter", () => matchMedia("(hover: hover)").matches && btn.setAttribute("aria-expanded", "true"));
    menu.addEventListener("mouseleave", () => { if (!menu.classList.contains("open")) btn.setAttribute("aria-expanded", "false"); });
  }

  const themeBtn = document.getElementById("themeBtn");
  const paintBtn = () => {
    if (!themeBtn) return;
    const dark = document.documentElement.dataset.theme !== "light";
    themeBtn.innerHTML = dark ? SUN : MOON;
    themeBtn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    themeBtn.title = dark ? "Light mode" : "Dark mode";
  };
  paintBtn();
  document.addEventListener("themechange", paintBtn);
  if (themeBtn) themeBtn.addEventListener("click", () => {
    window.setTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
    paintBtn();
  });

  /* ---------- Site name above the title, "Last updated" below ---------- */
  document.querySelectorAll("[data-head]").forEach(el => {
    el.insertAdjacentHTML("afterbegin", `<a class="site-name" href="${page(root, "")}">${S.name}</a>`);
    const upd = `<p class="updated">${S.updated}</p>`, before = el.querySelector(".jump, .mode-tabs, .ctas, .seg");
    before ? before.insertAdjacentHTML("beforebegin", upd) : el.insertAdjacentHTML("beforeend", upd);
  });

  /* ---------- Footer ---------- */
  document.querySelectorAll("[data-footer]").forEach(el => {
    el.innerHTML = `
      <div class="wrap">
        <div class="foot-brand">${S.brandHTML}</div>
        <p class="fnote">${S.descriptor}</p>
        <a class="kofi" href="${S.kofi}" target="_blank" rel="noopener" data-noshot>${CUP} Support on Ko-fi</a>
        <p class="src">${S.sources}<br>${S.nav.map(n => `<a href="${page(root, n.href)}">${n.label}</a>`).join(" &nbsp;·&nbsp; ")}<br>${S.menu.map(m => `<a href="${page(root, m.href)}">${m.label}</a>`).join(" &nbsp;·&nbsp; ")}<br><span style="white-space:nowrap">Created by ${S.creator}</span></p>
      </div>`;
  });

  // In-page links marked data-page also work from file://
  document.querySelectorAll("a[data-page]").forEach(a => { a.href = page(a.dataset.root || root, a.dataset.page); });
  if (!document.title.includes(S.name)) document.title = S.name + " · " + document.title;

  /* ---------- Scroll reveal: sections fade up as they enter ---------- */
  const reveal = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && reveal.length) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { rootMargin: "0px 0px -8% 0px" });
    reveal.forEach(n => io.observe(n));
  } else reveal.forEach(n => n.classList.add("in"));

  /* ---------- Screenshot ---------- */
  document.body.insertAdjacentHTML("beforeend", `
    <div class="modal" id="shotModal" role="dialog" aria-modal="true" aria-label="Screenshot preview" data-noshot>
      <div class="modal-card">
        <div class="modal-top">
          <div><b>Screenshot ready</b><div class="hint">On a phone, press and hold the image to save it.</div></div>
          <div class="modal-actions"><a id="shotDownload" class="primary" href="#" download="keystotherace.png">Download</a><button id="shotClose" type="button">Close</button></div>
        </div>
        <div class="modal-body"><img id="shotImg" alt="Screenshot of this page"></div>
      </div>
    </div>`);
  const modal = document.getElementById("shotModal");
  const close = () => modal.classList.remove("open");
  document.getElementById("shotClose").addEventListener("click", close);
  modal.addEventListener("click", e => { if (e.target === modal) close(); });
  const loadLib = () => window.html2canvas ? Promise.resolve() : new Promise((ok, fail) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    s.onload = ok; s.onerror = fail; document.head.appendChild(s);
  });
  const btn = document.getElementById("shotBtn");
  if (btn) btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      await loadLib();
      const canvas = await html2canvas(document.body, {
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        scale: Math.min(2, window.devicePixelRatio || 1), useCORS: true,
        windowWidth: document.documentElement.clientWidth,
        ignoreElements: n => n.hasAttribute && n.hasAttribute("data-noshot")
      });
      const url = canvas.toDataURL("image/png");
      document.getElementById("shotImg").src = url;
      document.getElementById("shotDownload").href = url;
      modal.classList.add("open");
    } catch (e) {
      console.warn("Screenshot failed", e);
    } finally { btn.disabled = false; }
  });
})();
