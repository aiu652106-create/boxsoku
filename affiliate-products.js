(function registerAffiliateProducts(root) {
  const token =
    "eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIxMjh4MTI4IiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImNvbXAiOiJkb3duIiwicHJpY2UiOjEsImJvciI6MSwiY29sIjoxLCJiYnRuIjoxLCJwcm9kIjowLCJhbXAiOmZhbHNlfQ%3D%3D";

  const product = ({ trackingCode, itemUrl, imageUrl, meId, itemId, ...item }) => ({
    ...item,
    url: `https://hb.afl.rakuten.co.jp/ichiba/${trackingCode}/?pc=${encodeURIComponent(
      itemUrl
    )}&link_type=picttext&ut=${token}`,
    image: `https://hbb.afl.rakuten.co.jp/hgb/${trackingCode}/?me_id=${meId}&item_id=${itemId}&pc=${encodeURIComponent(
      imageUrl
    )}%3F_ex%3D128x128&s=128x128&t=picttext`,
    checkedAt: "2026/8/9"
  });

  root.BoxingAffiliateSupplementalProducts = [
    product({ title: "天心キーホルダー", price: "1,100円（税込、送料別）", family: "tenshin-keyholder", audience: "tenshin", trackingCode: "567366c9.b2f853c4.567366ca.2bd8383e", meId: "1337810", itemId: "10000940", itemUrl: "https://item.rakuten.co.jp/higosports/ism-tp-005/", imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/higosports/cabinet/12129874/12146687/1_000000001068.jpg" }),
    product({ title: "ALL OR NOTHING 那須川天心写真集", price: "4,180円（税込、送料無料）", family: "tenshin-photo-book", audience: "tenshin", trackingCode: "56735f5d.198cf9f9.56735f5e.de85ab88", meId: "1213310", itemId: "20636965", itemUrl: "https://item.rakuten.co.jp/book/17111141/", imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/book/cabinet/4054/9784096824054_1_7.jpg" }),
    product({ title: "那須川天心 フィギュア", price: "5,500円（税込、送料別）", family: "tenshin-figure", audience: "tenshin", trackingCode: "567366d9.e53ff315.567366dd.43cc0378", meId: "1278752", itemId: "10005403", itemUrl: "https://item.rakuten.co.jp/auc-kuunerudou/10005403/", imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/auc-kuunerudou/cabinet/000001/02975043/04222624/imgrc0089131803.jpg" }),
    product({ title: "天心式キックボクシング入門", price: "1,870円", family: "tenshin-training-book", audience: "tenshin", trackingCode: "567366e1.1f280132.567366e2.d7b04b60", meId: "1278256", itemId: "17817443", itemUrl: "https://item.rakuten.co.jp/rakutenkobo-ebooks/9ac2d7cfb78d36d7ac7281e46e306e43/", imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/rakutenkobo-ebooks/cabinet/8505/2000006878505.jpg" }),
    product({ title: "天心モデル ボクシンググローブ", price: "14,080円（税込、送料別）", family: "tenshin-gloves", audience: "tenshin", trackingCode: "567366e9.b2fa0eef.567366ea.d8b4970d", meId: "1201676", itemId: "10039786", itemUrl: "https://item.rakuten.co.jp/fitnessclub/ism-tp-001-8-12/", imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/fitnessclub/cabinet/isami/main-tp-001-8-12.jpg" }),
    product({ title: "リバーサル 那須川天心 ドライTシャツ", price: "5,500円（税込、送料別）", family: "tenshin-dry-shirt", audience: "tenshin", trackingCode: "567366ed.36efc918.567366ee.53764e38", meId: "1309134", itemId: "10005031", itemUrl: "https://item.rakuten.co.jp/suavetribe/10002253/", imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/suavetribe/cabinet/04209763/11419639/imgrc0109235799.jpg" }),
    product({ title: "TEAM TENSHIN Tシャツ", price: "7,650円（税込、送料別）", family: "tenshin-team-shirt", audience: "tenshin", trackingCode: "56736728.016007e9.56736729.1a9cd803", meId: "1303380", itemId: "10022324", itemUrl: "https://item.rakuten.co.jp/level6/619407/", imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/level6/cabinet/level6/rakuten_item4/619407-r.jpg" }),
    product({ title: "ALL OR NOTHING 那須川天心写真集 電子書籍版", price: "3,762円", family: "tenshin-photo-ebook", audience: "tenshin", trackingCode: "567366e1.1f280132.567366e2.d7b04b60", meId: "1278256", itemId: "21201866", itemUrl: "https://item.rakuten.co.jp/rakutenkobo-ebooks/f1c749dc96a4339a8b4824edaa49abe2/", imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/rakutenkobo-ebooks/cabinet/2829/2000011202829.jpg" }),
    product({ title: "天心語録 電子書籍版", price: "1,430円", family: "tenshin-quote-ebook", audience: "tenshin", trackingCode: "567366e1.1f280132.567366e2.d7b04b60", meId: "1278256", itemId: "21999936", itemUrl: "https://item.rakuten.co.jp/rakutenkobo-ebooks/214cf8c0589a34eea6abdd46cfdf4a0d/", imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/rakutenkobo-ebooks/cabinet/8522/2000012528522.jpg" }),
    product({ title: "リバーサル 那須川天心 ワークグローブ", price: "660円（税込、送料別）", family: "tenshin-work-gloves", audience: "tenshin", trackingCode: "567366ed.36efc918.567366ee.53764e38", meId: "1309134", itemId: "10005089", itemUrl: "https://item.rakuten.co.jp/suavetribe/10002301/", imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/suavetribe/cabinet/04209763/12080097/rv25aw710.jpg" }),
    product({ title: "那須川天心物語 コミック", price: "1,534円（税込、送料別）", family: "tenshin-comic", audience: "tenshin", trackingCode: "56736781.6dc3d1a4.56736782.e6fdf89f", meId: "1249489", itemId: "13810433", itemUrl: "https://item.rakuten.co.jp/comicset/4065184878/", imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/comicset/cabinet/09070504/bk3ewwwfw7yjqwvi.jpg" }),
    product({ title: "本革ボクシンググローブ キーホルダー", price: "1,980円（税込、送料別）", family: "boxing-leather-keyholder", audience: "general", trackingCode: "56736945.b539c30c.56736946.4e785773", meId: "1269297", itemId: "10000462", itemUrl: "https://item.rakuten.co.jp/vanca/50919/", imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/vanca/cabinet/cate-docodemo/50919_1.jpg" }),
    product({ title: "THREE ARMS ボクシングバンデージ", price: "1,880円（税込、送料無料）", family: "boxing-wraps", audience: "general", trackingCode: "56736959.74ba384f.5673695a.1b5dabfa", meId: "1286883", itemId: "17984831", itemUrl: "https://item.rakuten.co.jp/mars405/map-iw00006/", imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/mars405/cabinet/05068837/rakuten3/map-iw00006.jpg" }),
    product({ title: "自宅用パンチングボール", price: "1,295円（税込、送料無料）", family: "boxing-punching-ball", audience: "general", trackingCode: "567369c6.66e36696.567369ca.a25c89fe", meId: "1306087", itemId: "10016657", itemUrl: "https://item.rakuten.co.jp/moccasin/x017/", imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/moccasin/cabinet/main04/x017.jpg" }),
    product({ title: "パンチングミット 2個セット", price: "1,480円（税込、送料無料）", family: "boxing-mitts", audience: "general", trackingCode: "567369d8.3e450ae5.567369d9.6aa12e88", meId: "1268543", itemId: "10116546", itemUrl: "https://item.rakuten.co.jp/hobbyone/pmitt-01/", imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/hobbyone/cabinet/mainpic01/pmitt-01.jpg" }),
    product({ title: "ZTTY ボクシンググローブ", price: "4,980円（税込、送料無料）", family: "boxing-ztty-gloves", audience: "general", trackingCode: "567369f8.84ca1ff0.567369fa.e25b8e69", meId: "1307590", itemId: "10000764", itemUrl: "https://item.rakuten.co.jp/wonder-stage/98bgl01/", imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/wonder-stage/cabinet/boxing/98bgl01-g.jpg" }),
    product({ title: "ミット打ちセット", price: "3,680円（税込、送料無料）", family: "boxing-mitt-set", audience: "general", trackingCode: "56736a1a.7a1d90f4.56736a1c.66668ff5", meId: "1341940", itemId: "10003224", itemUrl: "https://item.rakuten.co.jp/k999/328631/", imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/k999/cabinet/item/san2/328631.jpg" }),
    product({ title: "stan インナーバンデージ", price: "2,379円（税込、送料無料）", family: "boxing-inner-wraps", audience: "general", trackingCode: "56736a30.c4e381e6.56736a31.bab13315", meId: "1369304", itemId: "10000053", itemUrl: "https://item.rakuten.co.jp/stan-shop/inner-bandage/", imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/stan-shop/cabinet/sin/innerbandage/sports_bandage_samb.jpg" }),
    product({ title: "自立式サンドバッグ", price: "12,900円（税込、送料別）", family: "boxing-standing-bag", audience: "general", trackingCode: "56736a40.0ac7c9a0.56736a41.bf2748c2", meId: "1302231", itemId: "10024368", itemUrl: "https://item.rakuten.co.jp/marz-shop/brpunchingbag001set/", imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/marz-shop/cabinet/image15/brpunchingbag001-1.jpg" }),
    product({ title: "通気性ボクシンググローブ", price: "3,850円（税込、送料別）", family: "boxing-mesh-gloves", audience: "general", trackingCode: "56736a4e.18897c8a.56736a4f.e5c19816", meId: "1363488", itemId: "10005330", itemUrl: "https://item.rakuten.co.jp/just-for-you001/zaka-554/", imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/just-for-you001/cabinet/06182528/zaka-554.jpg" }),
    product({ title: "ダブルミット・キックパッドセット", price: "4,500円（税込、送料別）", family: "boxing-double-mitts", audience: "general", trackingCode: "56736a50.ab785f46.56736a51.63a73a9d", meId: "1255430", itemId: "10002448", itemUrl: "https://item.rakuten.co.jp/dream-brother/fxb-jb-3set/", imageUrl: "https://thumbnail.image.rakuten.co.jp/@0_mall/dream-brother/cabinet/06652300/10009219/fxb-jb-3set.jpg" })
  ];

  const seedFor = (value) =>
    [...String(value || "affiliate-products")].reduce(
      (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
      7
    );

  const priceNumber = (item) =>
    Number(String(item?.price || "").replace(/[^0-9]/g, "")) || 0;

  const articleSource = (article) => {
    const affiliateLinks = article?.affiliateLinks || article?.affiliate_links || [];
    const fightCardBlocks = Array.isArray(affiliateLinks)
      ? affiliateLinks.filter((item) => item?.type === "fight_cards")
      : [];
    return [
      article?.title,
      article?.summary,
      article?.body,
      JSON.stringify(article?.fightCards || article?.fight_cards || []),
      JSON.stringify(fightCardBlocks)
    ]
      .filter(Boolean)
      .join("\n");
  };

  const takeProducts = (pool, count, seed, usedFamilies, options = {}) => {
    if (!pool.length || count <= 0) return [];
    const selected = [];
    let premiumCount = options.premiumCount || 0;
    for (let offset = 0; offset < pool.length * 2 && selected.length < count; offset += 1) {
      const item = pool[(seed + offset * 7) % pool.length];
      const family = item.family || item.url;
      const isPremium = priceNumber(item) > 8000;
      if (usedFamilies.has(family) || (isPremium && premiumCount >= 1)) continue;
      usedFamilies.add(family);
      selected.push({ ...item });
      if (isPremium) premiumCount += 1;
    }
    options.premiumCount = premiumCount;
    return selected;
  };

  const select = ({ article = {}, baseProducts = [], limit = 4 } = {}) => {
    const products = [...baseProducts];
    const source = articleSource(article);
    const seed = seedFor(article?.slug || article?.id || source);
    const usedFamilies = new Set();
    const premiumState = { premiumCount: 0 };
    const isTenshinArticle = /那須川\s*天心|TENSHIN/i.test(source);
    const isInoueArticle = /井上\s*尚弥|NAOYA\s*INOUE/i.test(source);
    const isOhashiArticle = /大橋(?:ボクシング)?ジム|PHOENIX\s+BATTLE|フェニックスバトル/i.test(source);
    const tenshinProducts = products.filter(
      (item) => item.audience === "tenshin" || /那須川\s*天心|天心語録|TENSHIN/i.test(item.title)
    );
    const inoueProducts = products.filter((item) => /井上\s*尚弥|NAOYA\s*INOUE/i.test(item.title));
    const ohashiProducts = products.filter(
      (item) => item.family === "gym-shirt" || /大橋ボクシングジム/i.test(item.title)
    );
    const generalProducts = products.filter((item) => item.audience === "general");
    const lowGeneralProducts = generalProducts.filter((item) => {
      const price = priceNumber(item);
      return price > 0 && price < 2000;
    });
    const lowTenshinProducts = tenshinProducts.filter((item) => {
      const price = priceNumber(item);
      return price > 0 && price < 2000;
    });

    const take = (pool, count, offset = 0) =>
      takeProducts(pool, count, seed + offset, usedFamilies, premiumState);
    const lowGeneral = take(lowGeneralProducts, 1, 11);
    const moreGeneral = (count) => take(generalProducts, count, 23);
    let selected = [];

    if (isTenshinArticle) {
      const lowTenshin = take(lowTenshinProducts, 1, 3);
      const moreTenshin = take(tenshinProducts, 3 - lowTenshin.length, 17);
      const tenshin = [...lowTenshin, ...moreTenshin];
      const general = [...lowGeneral, ...moreGeneral(1 - lowGeneral.length)];
      selected = [tenshin[0], general[0], tenshin[1], tenshin[2]];
    } else if (isInoueArticle) {
      const inoue = take(inoueProducts, 3, 5);
      const general = [...lowGeneral, ...moreGeneral(1 - lowGeneral.length)];
      selected = [inoue[0], general[0], inoue[1], inoue[2]];
    } else if (isOhashiArticle) {
      const ohashi = take(ohashiProducts, 1, 7);
      const inoue = take(inoueProducts, 2, 13);
      const general = [...lowGeneral, ...moreGeneral(1 - lowGeneral.length)];
      selected = [ohashi[0], inoue[0], general[0], inoue[1]];
    } else {
      const inoue = take(inoueProducts, 2, 19);
      const general = [...lowGeneral, ...moreGeneral(2 - lowGeneral.length)];
      selected = [inoue[0], general[0], inoue[1], general[1]];
    }

    const allowedFallback = isTenshinArticle
      ? [...tenshinProducts, ...generalProducts]
      : products.filter((item) => item.audience !== "tenshin" && !/那須川\s*天心|天心語録|TENSHIN/i.test(item.title));
    selected = selected.filter(Boolean);
    if (selected.length < limit) {
      selected.push(...take(allowedFallback, limit - selected.length, 31));
    }
    return selected.slice(0, limit);
  };

  root.BoxingAffiliateSelector = { select };
})(globalThis);
