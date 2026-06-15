(function () {
  const adsense = window.BOXING_CONFIG?.adsense || {};
  const client = String(adsense.client || "").trim();
  const slots = adsense.slots || {};
  const validClient = /^ca-pub-\d{16}$/.test(client);

  function ensureScript() {
    if (
      !validClient ||
      document.querySelector('script[data-boxing-adsense="true"]')
    ) {
      return;
    }
    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.boxingAdsense = "true";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
      client
    )}`;
    document.head.appendChild(script);
  }

  function render(root = document) {
    if (!validClient) return;
    ensureScript();
    const containers = [
      ...(root.matches?.("[data-ad-slot-name]") ? [root] : []),
      ...root.querySelectorAll("[data-ad-slot-name]")
    ];
    containers.forEach((container) => {
      if (container.dataset.adInitialized === "true") return;
      const slotName = container.dataset.adSlotName;
      const slot = String(slots[slotName] || "").trim();
      if (!slot) {
        container.hidden = true;
        return;
      }

      const label = document.createElement("small");
      label.textContent = "広告";

      const ad = document.createElement("ins");
      ad.className = "adsbygoogle";
      ad.style.display = "block";
      ad.dataset.adClient = client;
      ad.dataset.adSlot = slot;
      ad.dataset.adFormat = "auto";
      ad.dataset.fullWidthResponsive = "true";

      container.hidden = false;
      container.dataset.adInitialized = "true";
      container.setAttribute("aria-label", "広告");
      container.replaceChildren(label, ad);
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    });
  }

  window.BoxingAds = { render };
  render();
})();
