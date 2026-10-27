/* ============================================================
   DEKUWEC download page
   Vanilla JS, no dependencies. Everything degrades gracefully:
   if the GitHub API call fails (offline, rate limit) the static
   values already in the HTML stay as they are.
   ============================================================ */

(function () {
  "use strict";

  const REPO = "KIOKO23-HUB/DEKUWEC-PORTAL";
  const API = "https://api.github.com/repos/" + REPO + "/releases/latest";
  const STABLE_APK =
    "https://github.com/" + REPO + "/releases/latest/download/DEKUWEC.apk";

  /* ─────────────── mobile navigation ─────────────── */

  const burger = document.getElementById("burger");
  const navLinks = document.getElementById("nav-links");

  function closeMenu() {
    if (!navLinks || !burger) return;
    navLinks.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
  }

  if (burger && navLinks) {
    burger.addEventListener("click", function () {
      const open = navLinks.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });

    navLinks.addEventListener("click", function (event) {
      if (event.target.tagName === "A") closeMenu();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMenu();
    });

    document.addEventListener("click", function (event) {
      if (!navLinks.contains(event.target) && !burger.contains(event.target)) closeMenu();
    });
  }

  /* ─────────────── nav shadow on scroll ─────────────── */

  const nav = document.getElementById("nav");
  let ticking = false;

  function onScroll() {
    if (nav) nav.classList.toggle("stuck", window.scrollY > 8);
    ticking = false;
  }

  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(onScroll);
      }
    },
    { passive: true }
  );
  onScroll();

  /* ─────────────── scroll reveal ─────────────── */

  const revealables = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    revealables.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    revealables.forEach(function (el) {
      el.classList.add("in-view");
    });
  }

  /* ─────────────── footer year ─────────────── */

  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ─────────────── live release info ─────────────── */

  function formatSize(bytes) {
    if (!bytes || bytes < 1024) return "";
    const mb = bytes / (1024 * 1024);
    return (mb < 10 ? mb.toFixed(1) : Math.round(mb)) + " MB";
  }

  function applyVersion(version) {
    if (!version) return;
    document.querySelectorAll("[data-version]").forEach(function (el) {
      el.textContent = version;
    });
  }

  function applySize(bytes) {
    const text = formatSize(bytes);
    if (!text) return;
    document.querySelectorAll("[data-size]").forEach(function (el) {
      el.textContent = text;
    });
  }

  function applyDownloadUrl(url) {
    if (!url) return;
    document.querySelectorAll("[data-download]").forEach(function (el) {
      el.setAttribute("href", url);
    });
  }

  function applyDigest(digest) {
    const el = document.getElementById("sha");
    if (!el || !digest) return;
    const hex = String(digest).replace(/^sha256:/i, "");
    if (!/^[0-9a-f]{32,}$/i.test(hex)) return;
    el.textContent = hex.slice(0, 16) + "\u2026" + hex.slice(-8);
    el.title = hex;
  }

  function loadReleaseInfo() {
    if (!("fetch" in window)) return;

    fetch(API, { headers: { Accept: "application/vnd.github+json" } })
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(function (release) {
        const tag = String(release.tag_name || "");
        const match = tag.match(/v?(\d+(?:\.\d+)*)\s*$/);
        if (match) applyVersion(match[1]);

        const assets = Array.isArray(release.assets) ? release.assets : [];
        const apk =
          assets.find(function (a) { return a.name === "DEKUWEC.apk"; }) ||
          assets.find(function (a) { return /\.apk$/i.test(a.name); });

        if (!apk) return;
        applySize(apk.size);
        applyDigest(apk.digest);
        // The API URL is always correct, even if the asset keeps a versioned name
        applyDownloadUrl(apk.browser_download_url || STABLE_APK);
      })
      .catch(function () {
        /* Keep the values already rendered in the HTML */
      });
  }

  loadReleaseInfo();
})();
