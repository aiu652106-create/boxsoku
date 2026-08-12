import "../../affiliate-products.js";

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const visitorCookieName = "boxsoku_visitor";

const isCrawlerRequest = (request) =>
  /(?:bot|crawler|spider|slurp|bingpreview|facebookexternalhit|preview)/i.test(
    String(request.headers.get("User-Agent") || "")
  );

const readCookie = (header, name) => {
  const item = String(header || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!item) return "";
  try {
    return decodeURIComponent(item.slice(name.length + 1));
  } catch {
    return "";
  }
};

const createVisitorToken = () => crypto.randomUUID();

const hashVisitorToken = async (token, salt) => {
  const input = new TextEncoder().encode(`${salt}:${token}`);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
};

const safeUrl = (value, defaultValue = "#") => {
  try {
    const url = new URL(String(value || ""), "https://example.invalid");
    if (url.protocol === "https:" || url.protocol === "http:") {
      if (url.origin === "https://example.invalid") {
        return `${url.pathname}${url.search}${url.hash}`;
      }
      return url.href;
    }
  } catch {}
  return defaultValue;
};

const safeHttpsUrl = (value) => {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
};

const fightImageUrl = (value) => {
  if (!String(value || "").trim()) return "";
  const image = safeUrl(value, "");
  try {
    const url = new URL(image);
    if (
      url.protocol === "https:" &&
      url.hostname === "boxmob.jp" &&
      url.pathname.startsWith("/sp/img/boxer/")
    ) {
      return `/image-proxy?url=${encodeURIComponent(url.href)}`;
    }
  } catch {}
  return image;
};

const safeBoxRecUrl = (value) => {
  try {
    const url = new URL(String(value || ""));
    if (
      url.protocol === "https:" &&
      /(^|\.)boxrec\.com$/i.test(url.hostname)
    ) {
      return url.href;
    }
  } catch {}
  return "";
};

const isTweetUrl = (value) =>
  /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/[A-Za-z0-9_]+\/status\/\d+(?:\/photo\/\d+)?(?:\?.*)?$/i.test(
    String(value || "").trim()
  );

const tweetEmbedHtml = (url) =>
  `<div class="retro-tweet"><blockquote class="twitter-tweet" data-lang="ja" data-dnt="true"><a href="${escapeHtml(
    safeUrl(url, "#")
  )}">Xで投稿を見る</a></blockquote></div>`;

const leminoAffiliateUrl =
  "https://tr.affiliate-sp.docomo.ne.jp/cl/d0000000236/5159/2";
const leminoAffiliateBanner = {
  linkUrl: "https://tr.affiliate-sp.docomo.ne.jp/cl/d0000000236/5159/52",
  imageUrl: "https://img.affiliate-sp.docomo.ne.jp/ad/d0000000236/52.jpg"
};
const wowowAffiliate = {
  text: {
    linkUrl: "https://px.a8.net/svt/ejp?a8mat=4B9XTD+FXXWPM+5DFW+5YJRM",
    label: "【映画・スポーツ・海外ドラマみるなら】WOWOWオンデマンド",
    impressionUrl:
      "https://www13.a8.net/0.gif?a8mat=4B9XTD+FXXWPM+5DFW+5YJRM"
  },
  banner: {
    linkUrl: "https://px.a8.net/svt/ejp?a8mat=4B9XTD+FXXWPM+5DFW+5YZ75",
    imageUrl:
      "https://www24.a8.net/svt/bgt?aid=260804209964&wid=002&eno=01&mid=s00000025070001003000&mc=1",
    impressionUrl:
      "https://www14.a8.net/0.gif?a8mat=4B9XTD+FXXWPM+5DFW+5YZ75"
  }
};

const stripSimpleMarkdown = (value = "") =>
  String(value)
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__|`)(.*?)\1/g, "$2")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const linkLeminoText = (value) =>
  String(value || "")
    .replaceAll(
      "配信：Lemino",
      `<a class="affiliate-streaming-link" href="${leminoAffiliateUrl}" target="_blank" rel="sponsored noopener noreferrer" data-affiliate-service="lemino" data-affiliate-placement="article-body">配信：Leminoで視聴する</a>`
    )
    .replaceAll(
      "配信: Lemino",
      `<a class="affiliate-streaming-link" href="${leminoAffiliateUrl}" target="_blank" rel="sponsored noopener noreferrer" data-affiliate-service="lemino" data-affiliate-placement="article-body">配信: Leminoで視聴する</a>`
    );

const articleInlineHtml = (value) =>
  linkLeminoText(
    escapeHtml(String(value || ""))
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.+?)__/g, "<strong>$1</strong>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
  );

const articleBodyHtml = (body, title = "", lead = "", tweets = []) => {
  const paragraphs = String(body || "")
    .split(/\n\s*\n/)
    .filter(
      (paragraph, index) => {
        const text = paragraph.trim();
        if (index === 0 && text === String(title || "").trim()) {
          return false;
        }
        return !(index <= 1 && lead && text === String(lead).trim());
      }
    )
    .filter(Boolean);
  const middleAdIndex =
    paragraphs.length >= 4 ? Math.ceil(paragraphs.length / 2) - 1 : -1;
  const inlineTweetUrls = new Set(
    paragraphs
      .map((paragraph) => String(paragraph).trim())
      .filter((url) => isTweetUrl(url))
  );
  const tweetUrls = jsonArray(tweets).filter(
    (url) => isTweetUrl(url) && !inlineTweetUrls.has(String(url).trim())
  );
  return (
    paragraphs
    .map((paragraph, index) => {
      const ad =
        index === middleAdIndex
          ? '<aside class="ad-slot" data-ad-slot-name="articleMiddle" aria-label="広告"></aside>'
          : "";
      const lines = paragraph.split(/\n/);
      const firstLine = String(lines[0] || "").trim();
      if (isTweetUrl(firstLine)) {
        const rest = lines.slice(1).join("\n").trim();
        return `${tweetEmbedHtml(firstLine)}${
          rest ? `<p>${escapeHtml(rest).replaceAll("\n", "<br>")}</p>` : ""
        }${tweetUrls[index] ? tweetEmbedHtml(tweetUrls[index]) : ""}${ad}`;
      }
      if (isTweetUrl(paragraph.trim())) {
        return `${tweetEmbedHtml(paragraph.trim())}${
          tweetUrls[index] ? tweetEmbedHtml(tweetUrls[index]) : ""
        }${ad}`;
      }
      const heading = firstLine.match(/^#{2,6}\s+(.+)$/);
      if (heading) {
        const rest = lines.slice(1).join("\n").trim();
        return `<h2>${articleInlineHtml(heading[1])}</h2>${
          rest
            ? `<p>${articleInlineHtml(rest).replaceAll("\n", "<br>")}</p>`
            : ""
        }${tweetUrls[index] ? tweetEmbedHtml(tweetUrls[index]) : ""}${ad}`;
      }
      const listItems = lines
        .map((line) => line.match(/^\s*[-*+]\s+(.+)$/)?.[1] || "")
        .filter(Boolean);
      if (listItems.length === lines.filter((line) => line.trim()).length) {
        return `<ul>${listItems
          .map((item) => `<li>${articleInlineHtml(item)}</li>`)
          .join("")}</ul>${tweetUrls[index] ? tweetEmbedHtml(tweetUrls[index]) : ""}${ad}`;
      }
      return `<p>${articleInlineHtml(paragraph).replaceAll("\n", "<br>")}</p>${
        tweetUrls[index] ? tweetEmbedHtml(tweetUrls[index]) : ""
      }${ad}`;
    })
    .join("") +
    tweetUrls
      .slice(paragraphs.length)
      .map((url) => tweetEmbedHtml(url))
      .join("")
  );
};

const jsonArray = (value) => (Array.isArray(value) ? value : []);

const hasTweetEmbeds = (article) =>
  jsonArray(article?.tweets).some((url) => isTweetUrl(url)) ||
  String(article?.body || "")
    .split(/\n/)
    .some((line) => isTweetUrl(line.trim()));

const rakutenPictTextToken =
  "eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIxMjh4MTI4IiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImNvbXAiOiJkb3duIiwicHJpY2UiOjEsImJvciI6MSwiY29sIjoxLCJiYnRuIjoxLCJwcm9kIjowLCJhbXAiOmZhbHNlfQ%3D%3D";
const rakutenBoxingPartner =
  "https://hb.afl.rakuten.co.jp/ichiba/5653e619.a81fc6cc.5653e61a.a6cc27b9/";
const rakutenMizunoPartner =
  "https://hb.afl.rakuten.co.jp/ichiba/5653e6af.b6bfc266.5653e6b0.a5e5a4e7/";
const rakutenHeathPartner =
  "https://hb.afl.rakuten.co.jp/ichiba/5653e2a5.fcd29aba.5653e2a6.838e9ac7/";
const rakutenBooksPartner =
  "https://hb.afl.rakuten.co.jp/ichiba/56735f5d.198cf9f9.56735f5e.de85ab88/";
const rakutenAffiliateUrl = (partner, itemUrl) =>
  `${partner}?pc=${encodeURIComponent(itemUrl)}&link_type=picttext&ut=${rakutenPictTextToken}`;
const affiliateProductPool = [
  {
    title: "大橋ボクシングジム コラボ HEATH Tシャツ メンズ 半袖",
    itemUrl: "https://item.rakuten.co.jp/heath-industrial/111t-kento/",
    image:
      "https://hbb.afl.rakuten.co.jp/hgb/5653e2a5.fcd29aba.5653e2a6.838e9ac7/?me_id=1231804&item_id=10015809&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fheath-industrial%2Fcabinet%2Fheath3%2Fst041_ht_rakuten.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
    price: "4,900円（税込、送料別）",
    family: "gym-shirt",
    partner: rakutenHeathPartner
  },
  {
    title: "【入荷しました】2020.10.31 LAS 井上尚弥 限定Tシャツ ブラック",
    itemUrl: "https://item.rakuten.co.jp/boxing/10002535/",
    image:
      "https://hbb.afl.rakuten.co.jp/hgb/5653e619.a81fc6cc.5653e61a.a6cc27b9/?me_id=1195019&item_id=10002535&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fboxing%2Fcabinet%2Fimgrc0118068580.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
    price: "4,400円（税込、送料無料）",
    family: "las-shirt",
    partner: rakutenBoxingPartner
  },
  {
    title: "【入荷しました】2020.10.31 LAS 井上尚弥 限定Tシャツ ホワイト",
    itemUrl: "https://item.rakuten.co.jp/boxing/10002536/",
    image:
      "https://hbb.afl.rakuten.co.jp/hgb/5653e619.a81fc6cc.5653e61a.a6cc27b9/?me_id=1195019&item_id=10002536&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fboxing%2Fcabinet%2Fimgrc0118068581.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
    price: "4,400円（税込、送料無料）",
    family: "las-shirt",
    partner: rakutenBoxingPartner
  },
  {
    title: "【入荷しました】25.1.24 TOKYO 井上尚弥 限定 WINNER Tシャツ ミズノ",
    itemUrl: "https://item.rakuten.co.jp/boxing/32jabx5601/",
    image:
      "https://hbb.afl.rakuten.co.jp/hgb/5653e619.a81fc6cc.5653e61a.a6cc27b9/?me_id=1195019&item_id=10004194&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fboxing%2Fcabinet%2Fimgrc0168208178.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
    price: "6,050円（税込、送料無料）",
    family: "shirt-0124",
    partner: rakutenBoxingPartner
  },
  {
    title: "【3-5日で発送】2024 5.6東京 ネリ戦 井上尚弥 限定 WINNER Tシャツ ミズノ",
    itemUrl: "https://item.rakuten.co.jp/boxing/32jabx51/",
    image:
      "https://hbb.afl.rakuten.co.jp/hgb/5653e619.a81fc6cc.5653e61a.a6cc27b9/?me_id=1195019&item_id=10003907&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fboxing%2Fcabinet%2Fimgrc0163852388.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
    price: "5,500円（税込、送料無料）",
    family: "shirt-0506",
    partner: rakutenBoxingPartner
  },
  {
    title: "【入荷しました】12.14 東京 井上尚弥限定 WINNER Tシャツ",
    itemUrl: "https://item.rakuten.co.jp/boxing/10002723/",
    image:
      "https://hbb.afl.rakuten.co.jp/hgb/5653e619.a81fc6cc.5653e61a.a6cc27b9/?me_id=1195019&item_id=10002723&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fboxing%2Fcabinet%2Fimgrc0130750673.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
    price: "4,400円（税込、送料無料）",
    family: "shirt-1214",
    partner: rakutenBoxingPartner
  },
  {
    title: "【入荷しました】12.14 東京 井上尚弥限定 WINNER Tシャツ（別カラー）",
    itemUrl: "https://item.rakuten.co.jp/boxing/10002724/",
    image:
      "https://hbb.afl.rakuten.co.jp/hgb/5653e619.a81fc6cc.5653e61a.a6cc27b9/?me_id=1195019&item_id=10002724&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fboxing%2Fcabinet%2Fimgrc0130750674.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
    price: "4,400円（税込、送料無料）",
    family: "shirt-1214",
    partner: rakutenBoxingPartner
  },
  {
    title: "【入荷しました】7.25東京 井上尚弥限定 WINNER Tシャツ ミズノ",
    itemUrl: "https://item.rakuten.co.jp/boxing/32jaax11/",
    image:
      "https://hbb.afl.rakuten.co.jp/hgb/5653e619.a81fc6cc.5653e61a.a6cc27b9/?me_id=1195019&item_id=10003307&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fboxing%2Fcabinet%2Fimgrc0153971159.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
    price: "4,400円（税込、送料無料）",
    family: "shirt-0725",
    partner: rakutenBoxingPartner
  },
  {
    title: "【入荷しました】2022/12/13 井上尚弥限定 WINNER Tシャツ",
    itemUrl: "https://item.rakuten.co.jp/boxing/10002945/",
    image:
      "https://hbb.afl.rakuten.co.jp/hgb/5653e619.a81fc6cc.5653e61a.a6cc27b9/?me_id=1195019&item_id=10002945&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fboxing%2Fcabinet%2Fimgrc0148084624.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
    price: "4,300円（税込、送料無料）",
    family: "shirt-1213",
    partner: rakutenBoxingPartner
  },
  {
    title: "井上尚弥 vs ノニト・ドネア Tシャツ（2022年6月7日）",
    itemUrl: "https://item.rakuten.co.jp/boxing/10002796/",
    image:
      "https://hbb.afl.rakuten.co.jp/hgb/5653e619.a81fc6cc.5653e61a.a6cc27b9/?me_id=1195019&item_id=10002796&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fboxing%2Fcabinet%2Fimgrc0141211734.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
    price: "3,000円（税込、送料無料）",
    family: "shirt-donaire",
    partner: rakutenBoxingPartner
  },
  {
    title: "【入荷しました】6.7 井上尚弥限定 WINNER Tシャツ",
    itemUrl: "https://item.rakuten.co.jp/boxing/10002805/",
    image:
      "https://hbb.afl.rakuten.co.jp/hgb/5653e619.a81fc6cc.5653e61a.a6cc27b9/?me_id=1195019&item_id=10002805&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fboxing%2Fcabinet%2Fimgrc0141495394.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
    price: "4,400円（税込、送料無料）",
    family: "shirt-0607",
    partner: rakutenBoxingPartner
  },
  {
    title: "ミズノ公式 6.7 井上尚弥VSノニト・ドネア限定Tシャツ",
    itemUrl: "https://item.rakuten.co.jp/mizunoshop/32ja260009/",
    image:
      "https://hbb.afl.rakuten.co.jp/hgb/5653e6af.b6bfc266.5653e6b0.a5e5a4e7/?me_id=1313488&item_id=10146307&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fmizunoshop%2Fcabinet%2Fgoods%2F1155%2Fsh_32ja260009.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
    price: "4,400円（税込、送料無料）",
    family: "shirt-0607",
    partner: rakutenMizunoPartner
  },
  {
    title: "【入荷しました】2022/12/13 井上尚弥 バスタオル",
    itemUrl: "https://item.rakuten.co.jp/boxing/10002946/",
    image:
      "https://hbb.afl.rakuten.co.jp/hgb/5653e619.a81fc6cc.5653e61a.a6cc27b9/?me_id=1195019&item_id=10002946&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fboxing%2Fcabinet%2Fimgrc0148084623.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
    price: "3,000円（税込、送料別）",
    family: "towel-1213",
    partner: rakutenBoxingPartner
  },
  {
    title: "【限定 入荷しました】7.25東京 井上尚弥限定 WINNERバスタオル ミズノ",
    itemUrl: "https://item.rakuten.co.jp/boxing/32jyax20/",
    image:
      "https://hbb.afl.rakuten.co.jp/hgb/5653e619.a81fc6cc.5653e61a.a6cc27b9/?me_id=1195019&item_id=10003308&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fboxing%2Fcabinet%2Fimgrc0153971158.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
    price: "3,000円（税込、送料別）",
    family: "towel-0725",
    partner: rakutenBoxingPartner
  },
  {
    title: "12.26東京 井上尚弥限定 WINNERバスタオル ミズノ",
    itemUrl: "https://item.rakuten.co.jp/boxing/32jaax52/",
    image:
      "https://hbb.afl.rakuten.co.jp/hgb/5653e619.a81fc6cc.5653e61a.a6cc27b9/?me_id=1195019&item_id=10003544&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fboxing%2Fcabinet%2Fimgrc0157419191.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
    price: "3,000円（税込、送料別）",
    family: "towel-1226",
    partner: rakutenBoxingPartner
  },
  {
    title: "天心語録 [ 那須川 天心 ]",
    itemUrl: "https://item.rakuten.co.jp/book/16958291/",
    image:
      "https://hbb.afl.rakuten.co.jp/hgb/56735f5d.198cf9f9.56735f5e.de85ab88/?me_id=1213310&item_id=20521680&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fbook%2Fcabinet%2F5072%2F9784910315072_1_65.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
    price: "1,540円（税込、送料無料）",
    family: "tenshin-book",
    audience: "tenshin",
    partner: rakutenBooksPartner,
    checkedAt: "2026/8/9"
  }
]
  .concat(globalThis.BoxingAffiliateSupplementalProducts || [])
  .map((item) => ({
  ...item,
  url: item.url || rakutenAffiliateUrl(item.partner, item.itemUrl),
  checkedAt: item.checkedAt || "2026/8/5"
}));

const selectRelevantAffiliateProductCards = (article, limit = 4) =>
  globalThis.BoxingAffiliateSelector.select({
    article,
    baseProducts: affiliateProductPool,
    limit
  });

const isNewsArticle = (article) => {
  const source = `${article?.title || ""}\n${article?.body || ""}`;
  const declaredCategory = String(article?.category || "").toLowerCase();
  return declaredCategory === "news" || /NEWS|\u30CB\u30E5\u30FC\u30B9/i.test(source);
};

const articleCategoryText = (article) => {
  const source = `${article?.title || ""}\n${article?.body || ""}`;
  if (/WOWOW|エキサイトマッチ/i.test(source)) return "WOWOWエキサイトマッチ";
  return isNewsArticle(article) ? "NEWS" : "試合日程";
};

const wowowAffiliateBannerHtml = (article) => {
  if (articleCategoryText(article) !== "WOWOWエキサイトマッチ") return "";
  const banner = wowowAffiliate.banner;
  return `<aside class="wowow-affiliate-banner" aria-label="WOWOWオンデマンド PR"><span class="wowow-affiliate-banner-label">PR</span><a href="${banner.linkUrl}" target="_blank" rel="sponsored nofollow noopener noreferrer" aria-label="WOWOWオンデマンドを確認する" data-affiliate-service="wowow" data-affiliate-placement="article-bottom-banner"><img class="wowow-affiliate-banner-image" src="${banner.imageUrl}" width="300" height="250" alt="WOWOWオンデマンド"></a><img class="wowow-affiliate-tracking-pixel" src="${banner.impressionUrl}" width="1" height="1" alt="" aria-hidden="true"></aside>`;
};

const wowowAffiliateTextHtml = (article) => {
  if (articleCategoryText(article) !== "WOWOWエキサイトマッチ") return "";
  const text = wowowAffiliate.text;
  return `<aside class="affiliate-teaser" aria-label="WOWOWオンデマンド PR"><div class="affiliate-teaser-copy"><span class="affiliate-teaser-label">PR・配信サービス</span><strong>WOWOWオンデマンドの視聴情報を確認</strong><span class="affiliate-teaser-note">料金・配信内容・視聴条件はリンク先でご確認ください。</span></div><a href="${text.linkUrl}" target="_blank" rel="sponsored nofollow noopener noreferrer" data-affiliate-service="wowow" data-affiliate-placement="article-top-text">${escapeHtml(text.label)}</a><img class="wowow-affiliate-tracking-pixel" src="${text.impressionUrl}" width="1" height="1" alt="" aria-hidden="true"></aside>`;
};

const leminoAffiliateBannerHtml = (article) => {
  const hasLeminoAffiliate = jsonArray(article?.affiliate_links).some((item) =>
    /Lemino|affiliate-sp\.docomo\.ne\.jp/i.test(`${item?.label || ""}\n${item?.url || ""}`)
  );
  if (!hasLeminoAffiliate) return "";
  return `<aside class="wowow-affiliate-banner lemino-affiliate-banner" aria-label="Leminoプレミアム PR"><span class="wowow-affiliate-banner-label">PR</span><a href="${leminoAffiliateBanner.linkUrl}" target="_blank" rel="sponsored nofollow noopener noreferrer" aria-label="Leminoプレミアムを確認する" data-affiliate-service="lemino" data-affiliate-placement="article-bottom-banner"><img class="wowow-affiliate-banner-image lemino-affiliate-banner-image" src="${leminoAffiliateBanner.imageUrl}" width="300" height="250" alt="Leminoプレミアム"></a></aside>`;
};

const articleCategoryPath = (article) => {
  const category = articleCategoryText(article);
  if (category === "WOWOWエキサイトマッチ") return "/wowow-excite-match";
  if (category === "NEWS") return "/boxing-news";
  return "/schedule";
};

const formatArticleDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("ja-JP");
};

const featuredFightCards = {
  "2026-08-16-treasure-boxing-promotion-14": [
    {
      weight: "スーパーバンタム級10回戦",
      left: {
        name: "小國 以載",
        profile: "https://boxrec.com/en/box-pro/518213",
        image: "https://boxrec.com/images/thumb/6/63/518213_2023.jpeg/200px-518213_2023.jpeg"
      },
      right: {
        name: "アレックス サンティシマ Jr.",
        profile: "https://boxrec.com/en/box-pro/895661",
        image: "https://boxrec.com/assets/images/main/v8-avatar-XyaKPuP.svg"
      }
    },
    {
      weight: "WBO-AP・OPBFスーパーウェルター級王座統一10回戦",
      left: {
        name: "豊嶋 亮太",
        profile: "https://boxrec.com/en/box-pro/704550",
        image: "https://boxrec.com/images/thumb/4/4d/704550.jpg/200px-704550.jpg"
      },
      right: {
        name: "緑川 創",
        profile: "https://boxrec.com/en/box-pro/1274846",
        image: "https://boxrec.com/assets/images/main/v8-avatar-XyaKPuP.svg"
      }
    },
    {
      weight: "WBO-AP・日本ミドル級王座決定10回戦",
      left: {
        name: "竹迫 司登",
        profile: "https://boxrec.com/en/box-pro/724918",
        image: "https://boxrec.com/images/thumb/f/f5/Kazuto_Takesako.jpeg/200px-Kazuto_Takesako.jpeg"
      },
      right: {
        name: "川渕 一統",
        profile: "https://boxrec.com/en/box-pro/1131567",
        image: "https://boxrec.com/assets/images/main/v8-avatar-XyaKPuP.svg"
      }
    },
    {
      weight: "日本ライトフライ級タイトルマッチ10回戦",
      left: {
        name: "亀山 大輝",
        profile: "https://boxrec.com/en/box-pro/749423",
        image: "https://boxrec.com/images/thumb/4/43/Daiki_Kameyama.JPG/200px-Daiki_Kameyama.JPG"
      },
      right: {
        name: "大橋 波月",
        profile: "https://boxrec.com/en/box-pro/762381",
        image: "https://boxrec.com/images/thumb/e/e7/Natsu_Ohashi.jpg/200px-Natsu_Ohashi.jpg"
      }
    },
    {
      weight: "スーパーバンタム級8回戦",
      left: {
        name: "細川 兼伸",
        profile: "https://boxrec.com/en/box-pro/1038164",
        image: "https://boxrec.com/assets/images/main/v8-avatar-XyaKPuP.svg"
      },
      right: {
        name: "森 朝登",
        profile: "https://boxrec.com/en/box-pro/834182",
        image: "https://boxrec.com/assets/images/main/v8-avatar-XyaKPuP.svg"
      }
    }
  ]
};

const featuredPhotoFallbacks = [
  "https://boxmob.jp/sp/img/boxer/1709295805.jpeg",
  "https://boxmob.jp/sp/img/boxer/1783088460.jpeg",
  "https://boxmob.jp/sp/img/boxer/1781109877.jpeg",
  "https://boxmob.jp/sp/img/boxer/1638448496.jpeg",
  "https://boxmob.jp/sp/img/boxer/1601015040.jpg"
];

const featuredDefaultSlug = "2026-08-16-treasure-boxing-promotion-14";
featuredFightCards[featuredDefaultSlug].forEach((fight, fightIndex) => {
  [fight.left, fight.right].forEach((fighter) => {
    if (fighter.image.includes("v8-avatar")) {
      fighter.image = featuredPhotoFallbacks[fightIndex];
      fighter.imageSource = "Boxing Mobile";
    }
  });
});

function fightCardsHtml(article) {
  const stored = jsonArray(article?.affiliate_links).find(
    (item) => item && item.type === "fight_cards" && Array.isArray(item.cards)
  );
  const fights = stored?.cards?.length
    ? stored.cards
    : featuredFightCards[article?.slug] || [];
  if (!fights.length) return "";
  const fightSortOrder = (value) => {
    const number = Number(String(value || "").match(/\d+/)?.[0]);
    if (Number.isFinite(number)) return number;
    if (String(value || "").includes("セミファイナル")) return 1000;
    if (String(value || "").includes("メインイベント")) return 1001;
    return 999;
  };
  const orderedFights = [...fights].sort((a, b) => {
    return fightSortOrder(a.bout) - fightSortOrder(b.bout);
  });
  const fighterHtml = (fighter, side) => {
    const profile = safeBoxRecUrl(fighter.profile);
    const image = fightImageUrl(fighter.image);
    const imageHtml = image
      ? `<${profile ? `a class="retro-fighter-photo retro-fighter-photo-${side}" href="${escapeHtml(
          profile
        )}" target="_blank" rel="noopener noreferrer"` : `div class="retro-fighter-photo retro-fighter-photo-${side}"`} aria-label="${escapeHtml(
          fighter.name
        )}のプロフィール画像"><img src="${escapeHtml(
          image
        )}" alt="${escapeHtml(fighter.name)}のプロフィール画像" loading="lazy" referrerpolicy="no-referrer"></${profile ? "a" : "div"}>`
      : "";
    const rankingHtml = fighter.ranking
      ? `<p class="retro-fighter-ranking">${escapeHtml(fighter.ranking)}</p>`
      : "";
    const nameHtml = profile
      ? `<a class="retro-fighter-name retro-fighter-name-${side}" href="${escapeHtml(
          profile
        )}" target="_blank" rel="noopener noreferrer">${escapeHtml(
          fighter.name
        )}</a>`
      : `<span class="retro-fighter-name retro-fighter-name-${side}">${escapeHtml(
          fighter.name
        )}</span>`;
    const linkHint = profile
      ? `<small class="retro-fighter-link-note">&#12463;&#12522;&#12483;&#12463;&#12391;BoxRec&#12503;&#12525;&#12501;&#12449;&#12452;&#12523;&#12434;&#38283;&#12367;</small>`
      : "";
    return `<div class="retro-fighter-card">${imageHtml}${nameHtml}${rankingHtml}${linkHint}</div>`;
  };
  return `<section class="retro-fight-cards" aria-labelledby="fight-card-heading"><div class="retro-fight-cards-heading"><span>FIGHT CARD</span><h2 id="fight-card-heading">対戦カード</h2></div>${orderedFights
    .map(
      (fight) => `<article class="retro-fight-card"><p class="retro-fight-number">${escapeHtml(
        fight.bout || ""
      )}</p><p class="retro-fight-weight">${escapeHtml(
        fight.weight
      )}</p><div class="retro-fight-card-grid">${fighterHtml(
        fight.left,
        "left"
      )}<span class="retro-fight-vs" aria-hidden="true">VS</span>${fighterHtml(
        fight.right,
        "right"
      )}</div></article>`
    )
    .join("")}</section>`;
}

function articleSummary(article) {
  const title = String(article?.title || "").trim();
  const rawSummary = String(article?.summary || "").trim();
  const body = String(article?.body || "").trim();
  let source = rawSummary || body;
  if (
    body &&
    (source.length > 220 ||
      /大会概要|全対戦カード|視聴方法|情報源と確認日/.test(source))
  ) {
    source = body;
  }
  let text = source.replace(/\r\n?/g, "\n").trim();
  if (title && text.startsWith(title)) {
    text = text.slice(title.length).replace(/^[\s|｜:：\-–—]+/, "").trim();
  } else if (title) {
    let common = 0;
    while (common < title.length && common < text.length && title[common] === text[common]) {
      common += 1;
    }
    if (common >= 16 && common >= title.length * 0.45) {
      text = text.slice(common).replace(/^[\s|｜:：\-–—]+/, "").trim();
    }
  }
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(stripSimpleMarkdown)
    .filter(
      (paragraph) =>
        paragraph.length >= 12 &&
        !/^(?:大会概要|配信情報|対戦カード|試合概要|全対戦カード|視聴方法|情報源と確認日)$/.test(
          paragraph
        )
    );
  text = paragraphs[0] || text.replace(/\s+/g, " ").trim();
  if (text.length < 70 && paragraphs[1]) {
    text = text + " " + paragraphs[1];
  }
  const maxLength = 500;
  if (text.length > maxLength) {
    const sentenceEnd = text.lastIndexOf("。", maxLength);
    text =
      sentenceEnd >= 80
        ? text.slice(0, sentenceEnd + 1)
        : text.slice(0, maxLength);
  }
  return stripSimpleMarkdown(text)
    .replace(/(?:公式情報|U-NEXT BOXING)\s*[:：]\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function youtubeId(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || "";
    if (url.pathname === "/watch") return url.searchParams.get("v") || "";
    const parts = url.pathname.split("/").filter(Boolean);
    if (["shorts", "embed", "live"].includes(parts[0])) return parts[1] || "";
  } catch {}
  return "";
}

function embedsHtml(article) {
  const videos = jsonArray(article.youtube_urls)
    .map((url) => youtubeId(url))
    .filter(Boolean)
    .map(
      (id) =>
        `<div class="retro-youtube"><iframe src="https://www.youtube-nocookie.com/embed/${escapeHtml(
          id
        )}" title="YouTube動画" loading="lazy" allowfullscreen></iframe></div>`
    )
    .join("");

  const instagram = jsonArray(article.instagram_urls)
    .map(
      (url) =>
        `<div class="retro-instagram"><blockquote class="instagram-media" data-instgrm-permalink="${escapeHtml(
          safeUrl(url, "#")
        )}" data-instgrm-version="14"><a href="${escapeHtml(
          safeUrl(url, "#")
        )}">Instagramで投稿を見る</a></blockquote></div>`
    )
    .join("");

  return instagram;
}

function videosHtml(article) {
  const videos = jsonArray(article.youtube_urls)
    .map((url) => youtubeId(url))
    .filter(Boolean)
    .map(
      (id) =>
        `<div class="retro-youtube"><iframe src="https://www.youtube-nocookie.com/embed/${escapeHtml(
          id
        )}" title="YouTube&#21205;&#30011;" loading="lazy" allowfullscreen></iframe></div>`
    )
    .join("");
  return videos ? `<div class="retro-article-videos">${videos}</div>` : "";
}

function affiliateLinksHtml(article) {
  const seenUrls = new Set();
  const links = jsonArray(article.affiliate_links)
    .filter((item) => item && item.label && item.url)
    .map((item) => {
      const source = `${item.label}\n${item.url}`;
      const targetUrl = /Lemino|affiliate-sp\.docomo\.ne\.jp/i.test(source)
        ? leminoAffiliateUrl
        : /WOWOW/i.test(source)
          ? wowowAffiliate.text.linkUrl
          : item.url;
      const url = safeUrl(targetUrl, "#");
      if (url === "#" || !url.startsWith("https://")) return "";
      if (seenUrls.has(url)) return "";
      seenUrls.add(url);
      const service = /affiliate-sp\.docomo\.ne\.jp/i.test(url)
        ? "lemino"
        : /px\.a8\.net/i.test(url)
          ? "wowow"
          : "other";
      return `<a href="${escapeHtml(
        url
      )}" target="_blank" rel="sponsored noopener noreferrer" data-affiliate-service="${service}" data-affiliate-placement="article-streaming-links">${escapeHtml(
        item.label
      )}</a>`;
    })
    .join("");
  return links
    ? `<aside class="affiliate-links"><strong>この試合を配信サイトで見る</strong>${links}<p class="affiliate-links-note">料金・配信内容・視聴条件はリンク先の公式ページでご確認ください。</p></aside>`
    : "";
}

function scheduleEventData(article, canonical, summary, image) {
  if (articleCategoryText(article) !== "試合日程") return null;
  const body = String(article?.body || "").replace(/\r\n?/g, "\n");
  const dateMatch = body.match(
    /(?:開催日|日程)\s*[:：]\s*(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日/
  );
  if (!dateMatch) return null;

  const startMatch = body.match(
    /(?:開始|試合開始|開始時刻)\s*[:：]\s*(\d{1,2})時(?:\s*(\d{1,2})分)?/
  );
  const [, year, month, day] = dateMatch;
  const date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const startDate = startMatch
    ? `${date}T${startMatch[1].padStart(2, "0")}:${String(
        startMatch[2] || "0"
      ).padStart(2, "0")}:00+09:00`
    : date;
  const venueMatch = body.match(/(?:会場|開催地)\s*[:：]\s*([^\n]+)/);
  const venue = venueMatch
    ? stripSimpleMarkdown(venueMatch[1]).replace(/\s*[-*]\s*$/, "").trim()
    : "";
  const fightCards = jsonArray(article?.affiliate_links).find(
    (item) => item && item.type === "fight_cards" && Array.isArray(item.cards)
  );
  const performerNames = [...new Set(
    (fightCards?.cards || [])
      .flatMap((card) => [card?.left?.name, card?.right?.name])
      .map((name) => String(name || "").trim())
      .filter(Boolean)
  )];

  return {
    "@type": "SportsEvent",
    name: article.title,
    description: summary,
    url: canonical,
    startDate,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    ...(venue
      ? {
          location: {
            "@type": "Place",
            name: venue,
            address: { "@type": "PostalAddress", addressCountry: "JP" }
          }
        }
      : {}),
    ...(image ? { image: [image] } : {}),
    ...(performerNames.length
      ? {
          performer: performerNames.map((name) => ({
            "@type": "Person",
            name
          }))
        }
      : {})
  };
}

function productCardsHtml(article) {
  const sourceCards = selectRelevantAffiliateProductCards(article);
  const cards = sourceCards
    .map((item) => ({
      title: String(item?.title || "").trim(),
      image: safeHttpsUrl(item?.image),
      url: safeHttpsUrl(item?.url),
      price: String(item?.price || "").trim(),
      checkedAt: String(item?.checkedAt || "").trim(),
      family: String(item?.family || "").trim()
    }))
    .filter((item) => item.title && item.image && item.url)
    .slice(0, 4);
  if (!cards.length) return "";

  return `<section class="affiliate-products" aria-label="おすすめ商品">${cards
    .map(
      (item) => `<a class="affiliate-product-card" href="${escapeHtml(
        item.url
      )}" target="_blank" rel="sponsored nofollow noopener" data-affiliate-service="rakuten" data-affiliate-placement="article-product" data-affiliate-item="${escapeHtml(
        item.family
      )}"><img src="${escapeHtml(
        item.image
      )}" alt="${escapeHtml(item.title)}の商品画像" loading="lazy" referrerpolicy="no-referrer"><span class="affiliate-product-card-content"><strong>${escapeHtml(
        item.title
      )}</strong>${
        item.price
          ? `<span class="affiliate-product-price">${escapeHtml(item.price)}</span>`
          : ""
      }${
        item.checkedAt
          ? `<small class="affiliate-product-checked-at">${escapeHtml(
              item.checkedAt
            )}時点</small>`
          : ""
      }<span class="affiliate-product-action">商品を見る</span></span></a>`
    )
    .join("")}</section>`;
}

function sidebarHtml(articles, ranked = false) {
  return articles
    .map(
      (article, index) => `<li>
        <a class="${article.image_url ? "" : "is-text-only"}" href="/news/${encodeURIComponent(article.slug)}">
          ${ranked ? `<span class="retro-sidebar-rank">${index + 1}</span>` : ""}
          ${
            article.image_url
              ? `<span class="retro-sidebar-thumbnail"><img src="${escapeHtml(
                  article.image_url
                )}" alt="${escapeHtml(article.title)}のアイキャッチ画像" loading="lazy"></span>`
              : ""
          }
          <span class="retro-sidebar-text">
            <strong>${escapeHtml(article.title)}</strong>
            <time>${escapeHtml(
              new Date(article.published_at).toLocaleDateString("ja-JP")
            )}</time>
          </span>
        </a>
      </li>`
    )
    .join("");
}

function relatedArticlesHtml(article, articles) {
  const source = `${article?.title || ""}\n${article?.body || ""}`;
  const group = /Lemino/i.test(source)
    ? "lemino"
    : /WOWOW|エキサイトマッチ/i.test(source)
      ? "wowow"
      : isNewsArticle(article)
        ? "news"
        : "schedule";
  const matchesGroup = (candidate) => {
    const candidateSource = `${candidate?.title || ""}\n${candidate?.body || ""}`;
    if (group === "lemino") return /Lemino/i.test(candidateSource);
    if (group === "wowow") return /WOWOW|エキサイトマッチ/i.test(candidateSource);
    if (group === "news") return isNewsArticle(candidate);
    return !/Lemino|WOWOW|エキサイトマッチ/i.test(candidateSource) && !isNewsArticle(candidate);
  };
  const related = articles
    .filter((candidate) => candidate.slug !== article.slug)
    .sort((left, right) => {
      const relevance = Number(matchesGroup(right)) - Number(matchesGroup(left));
      return relevance || new Date(right.published_at) - new Date(left.published_at);
    })
    .slice(0, 4);
  if (!related.length) return "";
  return `<section class="related-section" aria-labelledby="related-heading"><h2 id="related-heading">関連記事</h2><ul>${related
    .map(
      (candidate) =>
        `<li><a href="/news/${encodeURIComponent(candidate.slug)}">${escapeHtml(
          candidate.title
        )}</a></li>`
    )
    .join("")}</ul></section>`;
}

async function supabaseRows(env, query) {
  let response = await fetch(`${env.SUPABASE_URL}/rest/v1/${query}`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`
    }
  });
  if (!response.ok && query.includes("boxrec_url")) {
    const legacyQuery = query.replace(/(?:%2C|,)boxrec_url/i, "");
    response = await fetch(`${env.SUPABASE_URL}/rest/v1/${legacyQuery}`, {
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`
      }
    });
  }
  if (!response.ok) throw new Error(`Supabase request failed: ${response.status}`);
  return response.json();
}

export async function onRequestGet(context) {
  const { env, params, request } = context;
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return new Response("Supabase environment variables are not configured.", {
      status: 503
    });
  }

  const slug = String(params.slug || "");
  const isVerificationRequest =
    new URL(request.url).searchParams.get("boxsoku_verify") === "1";
  const isHeadRequest = request.method === "HEAD";
  const crawlerRequest = isCrawlerRequest(request);
  const shouldSkipAnalytics = isVerificationRequest || isHeadRequest || crawlerRequest;
  const existingVisitorToken = readCookie(
    request.headers.get("Cookie"),
    visitorCookieName
  );
  const visitorToken = existingVisitorToken || createVisitorToken();
  const visitorHash = await hashVisitorToken(
    visitorToken,
    String(env.VISITOR_ID_SALT || env.COMMENT_ID_SALT || env.SITE_URL || "boxsoku")
  );
  const select = encodeURIComponent(
    "id,slug,title,summary,body,image_url,boxrec_url,accent,is_advertorial,affiliate_disclosure,affiliate_links,tweets,youtube_urls,instagram_urls,published_at,updated_at"
  );
  const [articles, latest, popular] = await Promise.all([
    supabaseRows(
      env,
      `articles?select=${select}&slug=eq.${encodeURIComponent(
        slug
      )}&status=eq.published&published_at=lte.${encodeURIComponent(
        new Date().toISOString()
      )}&limit=1`
    ),
    supabaseRows(
      env,
      `articles?select=slug,title,image_url,accent,published_at&status=eq.published&published_at=lte.${encodeURIComponent(
        new Date().toISOString()
      )}&order=published_at.desc&limit=8`
    ),
    supabaseRows(
      env,
      `articles?select=slug,title,image_url,accent,published_at&status=eq.published&published_at=lte.${encodeURIComponent(
        new Date().toISOString()
      )}&order=view_count.desc,published_at.desc&limit=5`
    )
  ]);

  const article = articles[0];
  if (!article) {
    return new Response("記事が見つかりません。", { status: 404 });
  }

  const siteUrl = String(env.SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
  const siteName = String(env.SITE_NAME || "ボクシング速報");
  const canonical = `${siteUrl}/news/${encodeURIComponent(article.slug)}`;
 const image = String(article.image_url || siteUrl + "/assets/boxing-arena.png");
  const summary = articleSummary(article);
  const metaDescription = summary.slice(0, 160);
  const hasAffiliateLinks = jsonArray(article.affiliate_links).some(
    (item) => item && item.label && item.url
  );
  const wowowBanner = wowowAffiliateBannerHtml(article);
  const leminoBanner = leminoAffiliateBannerHtml(article);
  const wowowTextAffiliate = wowowAffiliateTextHtml(article);
  const productCards = productCardsHtml(article);
  const hasProductCards = Boolean(productCards);
  const disclosure = article.is_advertorial || hasAffiliateLinks || wowowBanner || hasProductCards
    ? `<aside class="affiliate-disclosure"><span class="affiliate-disclosure-badge">PR</span><span>${escapeHtml(
        article.affiliate_disclosure ||
          "この記事には配信サービスのアフィリエイトリンクが含まれています。"
      )}</span></aside>`
    : "";
  const categoryPath = articleCategoryPath(article);
  const categoryText = articleCategoryText(article);
  const organizationId = `${siteUrl}/#organization`;
  const eventData = scheduleEventData(article, canonical, summary, image);
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: siteName,
        url: siteUrl,
        email: "bokusoku446@gmail.com"
      },
      {
        "@type": isNewsArticle(article) ? "NewsArticle" : "Article",
        headline: article.title,
        description: summary,
        ...(image ? { image: [image] } : {}),
        datePublished: article.published_at,
        dateModified: article.updated_at || article.published_at,
        mainEntityOfPage: canonical,
        author: { "@id": organizationId },
        publisher: { "@id": organizationId }
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "ホーム", item: `${siteUrl}/` },
          {
            "@type": "ListItem",
            position: 2,
            name: categoryText,
            item: `${siteUrl}${categoryPath}`
          },
          { "@type": "ListItem", position: 3, name: article.title, item: canonical }
        ]
      },
      ...(eventData ? [eventData] : [])
    ]
  }).replaceAll("<", "\\u003c");

  const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta name="description" content="${escapeHtml(metaDescription)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(article.title)}">
  <meta property="og:description" content="${escapeHtml(metaDescription)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  ${image ? `<meta property="og:image" content="${escapeHtml(image)}">` : ""}
  <meta property="og:site_name" content="${escapeHtml(siteName)}">
  <meta property="article:published_time" content="${escapeHtml(article.published_at)}">
  <meta property="article:modified_time" content="${escapeHtml(
    article.updated_at || article.published_at
  )}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(article.title)}">
  <meta name="twitter:description" content="${escapeHtml(metaDescription)}">
  ${image ? `<meta name="twitter:image" content="${escapeHtml(image)}">` : ""}
  <title>${escapeHtml(article.title)} | ${escapeHtml(siteName)}</title>
  <script async data-boxing-adsense="true" src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5867435180256987" crossorigin="anonymous"></script>
  <script type="application/ld+json">${structuredData}</script>
   <link rel="stylesheet" href="/styles.css?v=20260811-seo-entry1">
  <script src="/config.js?v=20260811-adsense-link1" defer></script>
  <script src="/site.js" defer></script>
  <script src="/comments.js" defer></script>
  <script src="/ads.js" defer></script>
</head>
<body class="retro-blog">
  <div class="retro-top"><div><span data-site-tagline>ボクシングのニュースと話題</span><a href="/about">運営者情報</a></div></div>
  <header class="retro-header"><a class="retro-logo" href="/"><strong data-site-name>${escapeHtml(
    siteName
  )}</strong><span>BOXING NEWS</span></a></header>
  <div class="retro-page-layout">
    <aside class="retro-sidebar retro-sidebar-popular"><nav class="retro-category-nav retro-category-sidebar" aria-label="記事カテゴリー"><a href="/schedule" data-category-filter="schedule">試合日程</a><a href="/lemino-boxing" data-category-filter="lemino">Leminoボクシング</a><a href="/boxing-news" data-category-filter="news">NEWS</a><a href="/wowow-excite-match" data-category-filter="wowow">WOWOWエキサイトマッチ</a></nav><section class="retro-sidebar-panel"><h2>人気記事</h2><ol class="retro-sidebar-list retro-ranking-list">${sidebarHtml(
      popular,
      true
    )}</ol></section></aside>
    <main class="retro-feed">
      <article class="retro-post retro-detail">
        <nav class="public-breadcrumb" aria-label="パンくずリスト"><a href="/">ホーム</a> &gt; <a href="${categoryPath}">${escapeHtml(
          categoryText
        )}</a> &gt; <span aria-current="page">${escapeHtml(article.title)}</span></nav>
        <div class="retro-title-row"><h1>${escapeHtml(
          article.title
        )}</h1><a class="retro-tweet-link" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(
          article.title
        )}&url=${encodeURIComponent(canonical)}" target="_blank" rel="noopener noreferrer">Tweet</a></div>
          <p class="retro-category">カテゴリ：${escapeHtml(categoryText)}</p>
        <div class="article-trust"><span>公開日：<time datetime="${escapeHtml(
          article.published_at
        )}">${escapeHtml(formatArticleDate(article.published_at))}</time></span>${
          formatArticleDate(article.updated_at) &&
          formatArticleDate(article.updated_at) !== formatArticleDate(article.published_at)
            ? `<span>更新日：<time datetime="${escapeHtml(
                article.updated_at
              )}">${escapeHtml(formatArticleDate(article.updated_at))}</time></span>`
            : ""
        }<span>編集・確認：ボクシング速報編集部</span></div>
        ${
          image
            ? `<img class="retro-post-image retro-detail-image" src="${escapeHtml(
                image
              )}" alt="${escapeHtml(article.title)}のアイキャッチ画像" loading="lazy">`
            : ""
        }
        ${disclosure}
        ${wowowTextAffiliate}
        <div class="retro-detail-body">${articleBodyHtml(
          article.body,
          article.title,
          summary,
          article.tweets
        )}${embedsHtml(article)}</div>
        ${affiliateLinksHtml(article)}
        <aside class="ad-slot" data-ad-slot-name="articleTop" aria-label="広告"></aside>
        ${fightCardsHtml(article)}
        ${videosHtml(article)}
        ${leminoBanner}
        ${wowowBanner}
        ${relatedArticlesHtml(article, latest)}
        ${productCards}
        <aside class="ad-slot" data-ad-slot-name="articleBottom" aria-label="広告"></aside>
        <div class="retro-meta"><time>${escapeHtml(
          new Date(article.published_at).toLocaleDateString("ja-JP")
        )}</time></div>
        <div
          class="retro-comments-mount"
          data-comment-article-id="${escapeHtml(article.id)}"
          data-comment-article-slug="${escapeHtml(article.slug)}"
        ></div>
        <p class="retro-back"><a href="/">トップページへ戻る</a></p>
      </article>
    </main>
    <aside class="retro-sidebar retro-sidebar-latest"><section class="retro-sidebar-panel"><h2>最新記事</h2><ul class="retro-sidebar-list">${sidebarHtml(
      latest
    )}</ul><aside class="ad-slot sidebar-ad" data-ad-slot-name="sidebar" aria-label="広告"></aside></section></aside>
  </div>
  <footer class="retro-footer"><a href="/">TOP PAGEへ</a><nav><a href="/about">運営者情報</a><a href="/privacy">プライバシーポリシー</a><a href="/disclaimer">免責事項</a><a href="/contact">お問い合わせ</a></nav><small>copyright &copy; <span data-current-year></span> <span data-site-name>${escapeHtml(
    siteName
  )}</span> all rights reserved.</small></footer>
  ${
    hasTweetEmbeds(article)
      ? '<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>'
      : ""
  }
  ${
    jsonArray(article.instagram_urls).length
      ? '<script async src="https://www.instagram.com/embed.js"></script>'
      : ""
  }
  ${
    false
      ? `<script>(function(){const image=document.querySelector(".retro-detail-image");if(!image||!image.parentNode)return;const link=document.createElement("a");link.className="retro-image-link";link.href=${JSON.stringify(
          boxrecUrl
        )};link.target="_blank";link.rel="noopener noreferrer";link.setAttribute("aria-label","BoxRecで選手情報を開く");image.parentNode.insertBefore(link,image);link.appendChild(image);})();</script>`
      : ""
  }
</body>
</html>`;

  context.waitUntil(
    (async () => {
      if (shouldSkipAnalytics) return;
      const headers = {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
      };
      const uniqueResponse = await fetch(
        `${env.SUPABASE_URL}/rest/v1/rpc/record_article_view`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            p_article_slug: slug,
            p_visitor_hash: visitorHash
          })
        }
      );
      if (!uniqueResponse.ok) {
        await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/increment_article_view`, {
          method: "POST",
          headers,
          body: JSON.stringify({ article_slug: slug })
        });
      }
    })().catch(() => {})
  );

  const responseHeaders = {
    "Content-Type": "text/html; charset=UTF-8",
    "Cache-Control": crawlerRequest
      ? "public, max-age=300, s-maxage=300"
      : "private, no-store"
  };
  if (!existingVisitorToken && !shouldSkipAnalytics) {
    responseHeaders["Set-Cookie"] = `${visitorCookieName}=${encodeURIComponent(
      visitorToken
    )}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`;
  }

  return new Response(isHeadRequest ? null : html, {
    headers: responseHeaders
  });
}

export async function onRequestHead(context) {
  return onRequestGet(context);
}
