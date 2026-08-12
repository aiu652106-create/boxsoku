(function () {
  const fallbackIconUrl = String(
    window.BOXING_CONFIG?.site?.iconUrl || "/assets/boxsoku-icon.png"
  ).trim();

  function resolveIconUrl(value) {
    const rawValue = String(value || fallbackIconUrl).trim();
    if (!rawValue) return "";

    try {
      const resolved = new URL(rawValue, document.baseURI);
      if (!["http:", "https:", "file:"].includes(resolved.protocol)) {
        return "";
      }
      return resolved.href;
    } catch {
      return "";
    }
  }

  function applyIcon(value) {
    const iconUrl = resolveIconUrl(value) || resolveIconUrl(fallbackIconUrl);
    if (!iconUrl) return;

    let link = document.querySelector("link[data-site-icon]");
    if (!link) {
      link = document.createElement("link");
      link.dataset.siteIcon = "true";
      link.rel = "icon";
      link.type = "image/png";
      document.head.appendChild(link);
    }
    link.href = iconUrl;
  }

  async function loadStoredIcon() {
    if (window.BoxingData?.getSiteSettings) {
      const settings = await window.BoxingData.getSiteSettings();
      applyIcon(settings?.siteIconUrl);
      return;
    }

    const supabaseConfig = window.BOXING_CONFIG?.supabase || {};
    const baseUrl = String(supabaseConfig.url || "").replace(/\/$/, "");
    const anonKey = String(supabaseConfig.anonKey || "").trim();
    if (!baseUrl || !anonKey) return;

    const response = await fetch(
      `${baseUrl}/rest/v1/site_settings?id=eq.global&select=site_icon_url`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`
        }
      }
    );
    if (!response.ok) return;
    const rows = await response.json();
    applyIcon(rows?.[0]?.site_icon_url);
  }

  applyIcon(fallbackIconUrl);
  loadStoredIcon().catch(() => {});
})();
