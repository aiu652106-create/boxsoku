(function () {
  const config = window.BOXING_CONFIG || {};
  const site = config.site || {};

  document.querySelectorAll("[data-site-name]").forEach((element) => {
    element.textContent = site.name || "ボクシング速報";
  });

  document.querySelectorAll("[data-site-tagline]").forEach((element) => {
    element.textContent = site.tagline || "";
  });

  document.querySelectorAll("[data-site-email]").forEach((element) => {
    const email = site.contactEmail || "";
    element.textContent = email;
    if (element.tagName === "A") {
      element.href = `mailto:${email}`;
    }
  });

  document.querySelectorAll("[data-current-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  const configuredUrl = /^https:\/\/.+/i.test(String(site.url || "")) &&
    !/^https:\/\/example\.com\/?$/i.test(String(site.url || ""));
  if (configuredUrl) {
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.href = new URL(canonical.getAttribute("href") || "/", site.url).href;
    }
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      ogUrl.content = new URL(window.location.pathname, site.url).href;
    }
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) {
      ogImage.content = new URL(ogImage.content, site.url).href;
    }
  }
})();
