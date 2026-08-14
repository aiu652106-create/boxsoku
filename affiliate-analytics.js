(function () {
  "use strict";

  if (new URLSearchParams(window.location.search).get("boxsoku_verify") === "1") {
    return;
  }

  function articleSlug() {
    const pathMatch = window.location.pathname.match(/^\/news\/([a-z0-9-]+)\/?$/);
    if (pathMatch) return pathMatch[1];
    const params = new URLSearchParams(window.location.search);
    return params.get("slug") || "";
  }

  document.addEventListener(
    "click",
    (event) => {
      const link = event.target.closest("a[data-boxsoku-affiliate-service]");
      if (!link) return;

      const payload = {
        articleSlug: articleSlug(),
        pagePath: `${window.location.pathname}${window.location.search}`.slice(0, 300),
        service: link.dataset.boxsokuAffiliateService || "",
        placement: link.dataset.boxsokuAffiliatePlacement || "",
        item: link.dataset.boxsokuAffiliateItem || ""
      };
      const body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/affiliate-click",
          new Blob([body], { type: "application/json" })
        );
        return;
      }
      fetch("/api/affiliate-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
        credentials: "same-origin"
      }).catch(() => {});
    },
    { capture: true }
  );
})();
