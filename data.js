(function () {
  const config = window.BOXING_CONFIG || {};
  const supabaseConfig = config.supabase || {};
  const isConfigured =
    /^https:\/\/.+\.supabase\.co$/i.test(String(supabaseConfig.url || "")) &&
    Boolean(String(supabaseConfig.anonKey || "").trim());

  const client =
    isConfigured && window.supabase?.createClient
      ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        })
      : null;

  const sampleArticles = [
    {
      id: "sample-1",
      slug: "sample-world-title",
      title: "世界タイトル戦を読むための5つの注目ポイント",
      summary:
        "距離、手数、主導権、採点、終盤の変化。試合を見る前に押さえておきたい観戦ポイントを整理します。",
      body:
        "世界タイトル戦では、単純なパンチ数だけでなく、どちらが自分の距離で試合を進めているかが重要です。\n\n前半はジャブと足の位置、後半は疲労によるガードや反応の変化に注目すると、試合の流れが見えやすくなります。\n\nこの記事はSupabase設定前に表示されるサンプルです。設定後は管理画面から実際の記事へ差し替えられます。",
      image: "assets/boxing-arena.png",
      imagePath: "",
      accent: "red",
      status: "published",
      isAdvertorial: false,
      affiliateDisclosure: "",
      affiliateLinks: [],
      tweets: [],
      youtubeUrls: [],
      instagramUrls: [],
      publishedAt: "2026-06-12T00:00:00+09:00",
      viewCount: 12,
      isSample: true
    },
    {
      id: "sample-2",
      slug: "sample-weigh-in",
      title: "前日計量で確認したいコンディションの見方",
      summary:
        "体重だけでは分からない選手の状態を、表情、姿勢、フェイスオフから読み取る基本を紹介します。",
      body:
        "計量結果は重要ですが、数字だけでコンディションを断定することはできません。\n\n表情や受け答え、立ち姿、計量後の回復時間など、複数の情報を合わせて見ることが大切です。",
      image: "assets/boxing-arena.png",
      imagePath: "",
      accent: "blue",
      status: "published",
      isAdvertorial: false,
      affiliateDisclosure: "",
      affiliateLinks: [],
      tweets: [],
      youtubeUrls: [],
      instagramUrls: [],
      publishedAt: "2026-06-11T00:00:00+09:00",
      viewCount: 8,
      isSample: true
    },
    {
      id: "sample-3",
      slug: "sample-undercard",
      title: "アンダーカードから見つける次世代の注目選手",
      summary:
        "メインイベントだけではない興行の楽しみ方。若手選手を見るときのチェックポイントをまとめます。",
      body:
        "若手選手を見るときは、派手なKOだけでなく、攻撃後の守備やラウンド間の修正力にも注目してみましょう。\n\n相手の特徴に合わせて戦い方を変えられる選手は、上のレベルでも活躍する可能性があります。",
      image: "assets/boxing-arena.png",
      imagePath: "",
      accent: "gold",
      status: "published",
      isAdvertorial: false,
      affiliateDisclosure: "",
      affiliateLinks: [],
      tweets: [],
      youtubeUrls: [],
      instagramUrls: [],
      publishedAt: "2026-06-10T00:00:00+09:00",
      viewCount: 4,
      isSample: true
    }
  ];

  const rawAffiliateProductPool = [
    {
      title: "大橋ボクシングジム コラボ HEATH Tシャツ メンズ 半袖",
      image:
        "https://hbb.afl.rakuten.co.jp/hgb/5653e2a5.fcd29aba.5653e2a6.838e9ac7/?me_id=1231804&item_id=10015809&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fheath-industrial%2Fcabinet%2Fheath3%2Fst041_ht_rakuten.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
      url:
        "https://hb.afl.rakuten.co.jp/ichiba/5653e2a5.fcd29aba.5653e2a6.838e9ac7/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fheath-industrial%2F111t-kento%2F&link_type=picttext&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIxMjh4MTI4IiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImNvbXAiOiJkb3duIiwicHJpY2UiOjEsImJvciI6MSwiY29sIjoxLCJiYnRuIjoxLCJwcm9kIjowLCJhbXAiOmZhbHNlfQ%3D%3D",
      price: "4,900円（税込、送料別）",
      family: "gym-shirt"
    },
    {
      title: "【入荷しました】2020.10.31 LAS 井上尚弥 限定Tシャツ ブラック",
      image:
        "https://hbb.afl.rakuten.co.jp/hgb/5653e619.a81fc6cc.5653e61a.a6cc27b9/?me_id=1195019&item_id=10002535&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fboxing%2Fcabinet%2Fimgrc0118068580.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
      url:
        "https://hb.afl.rakuten.co.jp/ichiba/5653e619.a81fc6cc.5653e61a.a6cc27b9/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fboxing%2F10002535%2F&link_type=picttext&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIxMjh4MTI4IiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImNvbXAiOiJkb3duIiwicHJpY2UiOjEsImJvciI6MSwiY29sIjoxLCJiYnRuIjoxLCJwcm9kIjowLCJhbXAiOmZhbHNlfQ%3D%3D",
      price: "4,400円（税込、送料無料）",
      family: "las-shirt"
    },
    {
      title: "【入荷しました】2020.10.31 LAS 井上尚弥 限定Tシャツ ホワイト",
      image:
        "https://hbb.afl.rakuten.co.jp/hgb/5653e619.a81fc6cc.5653e61a.a6cc27b9/?me_id=1195019&item_id=10002536&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fboxing%2Fcabinet%2Fimgrc0118068581.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
      url:
        "https://hb.afl.rakuten.co.jp/ichiba/5653e619.a81fc6cc.5653e61a.a6cc27b9/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fboxing%2F10002536%2F&link_type=picttext&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIxMjh4MTI4IiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImNvbXAiOiJkb3duIiwicHJpY2UiOjEsImJvciI6MSwiYm9yIjoxLCJjb2wiOjEsImJidG4iOjEsInByb2QiOjAsImFtcCI6ZmFsc2V9",
      price: "4,400円（税込、送料無料）",
      family: "las-shirt"
    },
    {
      title: "【入荷しました】25.1.24 TOKYO 井上尚弥 限定 WINNER Tシャツ ミズノ",
      image:
        "https://hbb.afl.rakuten.co.jp/hgb/5653e619.a81fc6cc.5653e61a.a6cc27b9/?me_id=1195019&item_id=10004194&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fboxing%2Fcabinet%2Fimgrc0168208178.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
      url:
        "https://hb.afl.rakuten.co.jp/ichiba/5653e619.a81fc6cc.5653e61a.a6cc27b9/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fboxing%2F32jabx5601%2F&link_type=picttext&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIxMjh4MTI4IiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImNvbXAiOiJkb3duIiwicHJpY2UiOjEsImJvciI6MSwiYm9yIjoxLCJjb2wiOjEsImJidG4iOjEsInByb2QiOjAsImFtcCI6ZmFsc2V9",
      price: "6,050円（税込、送料無料）",
      family: "shirt-0124"
    },
    {
      title: "【3-5日で発送】2024 5.6東京 ネリ戦 井上尚弥 限定 WINNER Tシャツ ミズノ",
      image:
        "https://hbb.afl.rakuten.co.jp/hgb/5653e619.a81fc6cc.5653e61a.a6cc27b9/?me_id=1195019&item_id=10003907&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fboxing%2Fcabinet%2Fimgrc0163852388.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
      url:
        "https://hb.afl.rakuten.co.jp/ichiba/5653e619.a81fc6cc.5653e61a.a6cc27b9/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fboxing%2F32jabx51%2F&link_type=picttext&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIxMjh4MTI4IiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImJvciI6MSwiY29sIjoxLCJiYnRuIjoxLCJwcm9kIjowLCJhbXAiOmZhbHNlfQ%3D%3D",
      price: "5,500円（税込、送料無料）",
      family: "shirt-0506"
    },
    {
      title: "【入荷しました】12.14 東京 井上尚弥限定 WINNER Tシャツ",
      image:
        "https://hbb.afl.rakuten.co.jp/hgb/5653e619.a81fc6cc.5653e61a.a6cc27b9/?me_id=1195019&item_id=10002723&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fboxing%2Fcabinet%2Fimgrc0130750673.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
      url:
        "https://hb.afl.rakuten.co.jp/ichiba/5653e619.a81fc6cc.5653e61a.a6cc27b9/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fboxing%2F10002723%2F&link_type=picttext&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIxMjh4MTI4IiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImNvbXAiOiJkb3duIiwicHJpY2UiOjEsImJvciI6MSwiY29sIjoxLCJiYnIiOjEsImNvbCI6MSwiYmJ0biI6MSwicHJvZCI6MCwiYW1wIjpmYWxzZX0%3D",
      price: "4,400円（税込、送料無料）",
      family: "shirt-1214"
    },
    {
      title: "【入荷しました】12.14 東京 井上尚弥限定 WINNER Tシャツ（別カラー）",
      image:
        "https://hbb.afl.rakuten.co.jp/hgb/5653e619.a81fc6cc.5653e61a.a6cc27b9/?me_id=1195019&item_id=10002724&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fboxing%2Fcabinet%2Fimgrc0130750674.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
      url:
        "https://hb.afl.rakuten.co.jp/ichiba/5653e619.a81fc6cc.5653e61a.a6cc27b9/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fboxing%2F10002724%2F&link_type=picttext&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIxMjh4MTI4IiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImNvbXAiOiJkb3duIiwicHJpY2UiOjEsImJvciI6MSwiYm9yIjoxLCJjb2wiOjEsImJidG4iOjEsInByb2QiOjAsImFtcCI6ZmFsc2V9",
      price: "4,400円（税込、送料無料）",
      family: "shirt-1214"
    },
    {
      title: "【入荷しました】7.25東京 井上尚弥限定 WINNER Tシャツ ミズノ",
      image:
        "https://hbb.afl.rakuten.co.jp/hgb/5653e619.a81fc6cc.5653e61a.a6cc27b9/?me_id=1195019&item_id=10003307&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fboxing%2Fcabinet%2Fimgrc0153971159.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
      url:
        "https://hb.afl.rakuten.co.jp/ichiba/5653e619.a81fc6cc.5653e61a.a6cc27b9/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fboxing%2F32jaax11%2F&link_type=picttext&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIxMjh4MTI4IiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImNvbXAiOiJkb3duIiwicHJpY2UiOjEsImJvciI6MSwiY29sIjoxLCJiYnRuIjoxLCJwcm9kIjowLCJhbXAiOmZhbHNlfQ%3D%3D",
      price: "4,400円（税込、送料無料）",
      family: "shirt-0725"
    },
    {
      title: "【入荷しました】2022/12/13 井上尚弥限定 WINNER Tシャツ",
      image:
        "https://hbb.afl.rakuten.co.jp/hgb/5653e619.a81fc6cc.5653e61a.a6cc27b9/?me_id=1195019&item_id=10002945&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fboxing%2Fcabinet%2Fimgrc0148084624.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
      url:
        "https://hb.afl.rakuten.co.jp/ichiba/5653e619.a81fc6cc.5653e61a.a6cc27b9/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fboxing%2F10002945%2F&link_type=picttext&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIxMjh4MTI4IiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOiEsImNvbXAiOjEsInByaWNlIjoxLCJib3IiOjEsImNvbCI6MSwiYmJ0biI6MSwicHJvZCI6MCwiYW1wIjpmYWxzZX0%3D",
      price: "4,300円（税込、送料無料）",
      family: "shirt-1213"
    },
    {
      title: "井上尚弥 vs ノニト・ドネア Tシャツ（2022年6月7日）",
      image:
        "https://hbb.afl.rakuten.co.jp/hgb/5653e619.a81fc6cc.5653e61a.a6cc27b9/?me_id=1195019&item_id=10002796&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fboxing%2Fcabinet%2Fimgrc0141211734.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
      url:
        "https://hb.afl.rakuten.co.jp/ichiba/5653e619.a81fc6cc.5653e61a.a6cc27b9/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fboxing%2F10002796%2F&link_type=picttext&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIxMjh4MTI4IiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImJvciI6MSwiY29sIjoxLCJiYnRuIjoxLCJwcm9kIjowLCJhbXAiOmZhbHNlfQ%3D%3D",
      price: "3,000円（税込、送料無料）",
      family: "shirt-donaire"
    },
    {
      title: "【入荷しました】6.7 井上尚弥限定 WINNER Tシャツ",
      image:
        "https://hbb.afl.rakuten.co.jp/hgb/5653e619.a81fc6cc.5653e61a.a6cc27b9/?me_id=1195019&item_id=10002805&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fboxing%2Fcabinet%2Fimgrc0141495394.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
      url:
        "https://hb.afl.rakuten.co.jp/ichiba/5653e619.a81fc6cc.5653e61a.a6cc27b9/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fboxing%2F10002805%2F&link_type=picttext&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIxMjh4MTI4IiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImJvciI6MSwiY29sIjoxLCJiYnRuIjoxLCJwcm9kIjowLCJhbXAiOmZhbHNlfQ%3D%3D",
      price: "4,400円（税込、送料無料）",
      family: "shirt-0607"
    },
    {
      title: "ミズノ公式 6.7 井上尚弥VSノニト・ドネア限定Tシャツ",
      image:
        "https://hbb.afl.rakuten.co.jp/hgb/5653e6af.b6bfc266.5653e6b0.a5e5a4e7/?me_id=1313488&item_id=10146307&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fmizunoshop%2Fcabinet%2Fgoods%2F1155%2Fsh_32ja260009.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
      url:
        "https://hb.afl.rakuten.co.jp/ichiba/5653e6af.b6bfc266.5653e6b0.a5e5a4e7/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fmizunoshop%2F32ja260009%2F&link_type=picttext&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIxMjh4MTI4IiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImNvbXAiOjEsInByaWNlIjoxLCJib3IiOjEsImNvbCI6MSwiYmJ0biI6MSwicHJvZCI6MCwiYW1wIjpmYWxzZX0%3D",
      price: "4,400円（税込、送料無料）",
      family: "shirt-0607"
    },
    {
      title: "【入荷しました】2022/12/13 井上尚弥 バスタオル",
      image:
        "https://hbb.afl.rakuten.co.jp/hgb/5653e619.a81fc6cc.5653e61a.a6cc27b9/?me_id=1195019&item_id=10002946&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fboxing%2Fcabinet%2Fimgrc0148084623.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
      url:
        "https://hb.afl.rakuten.co.jp/ichiba/5653e619.a81fc6cc.5653e61a.a6cc27b9/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fboxing%2F10002946%2F&link_type=picttext&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIxMjh4MTI4IiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImNvbXAiOjEsImJvciI6MSwiY29sIjoxLCJiYnRuIjoxLCJwcm9kIjowLCJhbXAiOmZhbHNlfQ%3D%3D",
      price: "3,000円（税込、送料別）",
      family: "towel-1213"
    },
    {
      title: "【限定 入荷しました】7.25東京 井上尚弥限定 WINNERバスタオル ミズノ",
      image:
        "https://hbb.afl.rakuten.co.jp/hgb/5653e619.a81fc6cc.5653e61a.a6cc27b9/?me_id=1195019&item_id=10003308&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fboxing%2Fcabinet%2Fimgrc0153971158.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
      url:
        "https://hb.afl.rakuten.co.jp/ichiba/5653e619.a81fc6cc.5653e61a.a6cc27b9/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fboxing%2F32jyax20%2F&link_type=picttext&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIxMjh4MTI4IiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImNvbXAiOjEsImJvciI6MSwiY29sIjoxLCJiYnRuIjoxLCJwcm9kIjowLCJhbXAiOmZhbHNlfQ%3D%3D",
      price: "3,000円（税込、送料別）",
      family: "towel-0725"
    },
    {
      title: "12.26東京 井上尚弥限定 WINNERバスタオル ミズノ",
      image:
        "https://hbb.afl.rakuten.co.jp/hgb/5653e619.a81fc6cc.5653e61a.a6cc27b9/?me_id=1195019&item_id=10003544&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fboxing%2Fcabinet%2Fimgrc0157419191.jpg%3F_ex%3D128x128&s=128x128&t=picttext",
      url:
        "https://hb.afl.rakuten.co.jp/ichiba/5653e619.a81fc6cc.5653e61a.a6cc27b9/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fboxing%2F32jaax52%2F&link_type=picttext&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIxMjh4MTI4IiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImNvbXAiOjEsImJvciI6MSwiYmJ0biI6MSwicHJvZCI6MCwiYW1wIjpmYWxzZX0%3D",
      price: "3,000円（税込、送料別）",
      family: "towel-1226"
    }
  ];
  const rakutenPictTextToken =
    "eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIxMjh4MTI4IiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImNvbXAiOiJkb3duIiwicHJpY2UiOjEsImJvciI6MSwiY29sIjoxLCJiYnRuIjoxLCJwcm9kIjowLCJhbXAiOmZhbHNlfQ%3D%3D";
  const normalizeRakutenAffiliateUrl = (value) => {
    try {
      const parsed = new URL(value);
      const itemUrl = parsed.searchParams.get("pc");
      if (!itemUrl) return value;
      return `${parsed.origin}${parsed.pathname}?pc=${encodeURIComponent(
        itemUrl
      )}&link_type=picttext&ut=${rakutenPictTextToken}`;
    } catch {
      return value;
    }
  };

  const affiliateProductPool = rawAffiliateProductPool.map((item) => ({
    ...item,
    url: normalizeRakutenAffiliateUrl(item.url),
    checkedAt: "2026/8/5"
  }));

  function affiliateProductSeed(value) {
    return [...String(value || "affiliate-products")].reduce(
      (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
      7
    );
  }

  function selectAffiliateProductCards(slug, limit = 4) {
    const pool = affiliateProductPool.slice();
    const selected = [];
    const usedFamilies = new Set();
    const seed = affiliateProductSeed(slug);
    for (let offset = 0; offset < pool.length && selected.length < limit; offset += 1) {
      const item = pool[(seed + offset * 7) % pool.length];
      if (usedFamilies.has(item.family)) continue;
      usedFamilies.add(item.family);
      selected.push({ ...item });
    }
    return selected;
  }

  function selectRelevantAffiliateProductCards(article) {
    return selectAffiliateProductCards(article?.slug || article?.id || "", 4);
  }

  const defaultFightCardsBySlug = {
    "2026-08-16-treasure-boxing-promotion-14": [
      {
        weight: "スーパーバンタム級10回戦",
        left: {
          name: "小國 以載",
          profile: "https://boxrec.com/en/box-pro/518213",
          image: "https://boxrec.com/images/thumb/6/63/518213_2023.jpeg/200px-518213_2023.jpeg",
          imageSource: "BoxRec"
        },
        right: {
          name: "アレックス サンティシマ Jr.",
          profile: "https://boxrec.com/en/box-pro/895661",
          image: "https://boxmob.jp/sp/img/boxer/1709295805.jpeg",
          imageSource: "Boxing Mobile"
        }
      },
      {
        weight: "WBO-AP・OPBFスーパーウェルター級王座統一10回戦",
        left: {
          name: "豊嶋 亮太",
          profile: "https://boxrec.com/en/box-pro/704550",
          image: "https://boxrec.com/images/thumb/4/4d/704550.jpg/200px-704550.jpg",
          imageSource: "BoxRec"
        },
        right: {
          name: "緑川 創",
          profile: "https://boxrec.com/en/box-pro/1274846",
          image: "https://boxmob.jp/sp/img/boxer/1783088460.jpeg",
          imageSource: "Boxing Mobile"
        }
      },
      {
        weight: "WBO-AP・日本ミドル級王座決定10回戦",
        left: {
          name: "竹迫 司登",
          profile: "https://boxrec.com/en/box-pro/724918",
          image: "https://boxrec.com/images/thumb/f/f5/Kazuto_Takesako.jpeg/200px-Kazuto_Takesako.jpeg",
          imageSource: "BoxRec"
        },
        right: {
          name: "川渕 一統",
          profile: "https://boxrec.com/en/box-pro/1131567",
          image: "https://boxmob.jp/sp/img/boxer/1781109877.jpeg",
          imageSource: "Boxing Mobile"
        }
      },
      {
        weight: "日本ライトフライ級タイトルマッチ10回戦",
        left: {
          name: "亀山 大輝",
          profile: "https://boxrec.com/en/box-pro/749423",
          image: "https://boxrec.com/images/thumb/4/43/Daiki_Kameyama.JPG/200px-Daiki_Kameyama.JPG",
          imageSource: "BoxRec"
        },
        right: {
          name: "大橋 波月",
          profile: "https://boxrec.com/en/box-pro/762381",
          image: "https://boxrec.com/images/thumb/e/e7/Natsu_Ohashi.jpg/200px-Natsu_Ohashi.jpg",
          imageSource: "BoxRec"
        }
      },
      {
        weight: "スーパーバンタム級8回戦",
        left: {
          name: "細川 兼伸",
          profile: "https://boxrec.com/en/box-pro/1038164",
          image: "https://boxmob.jp/sp/img/boxer/1638448496.jpeg",
          imageSource: "Boxing Mobile"
        },
        right: {
          name: "森 朝登",
          profile: "https://boxrec.com/en/box-pro/834182",
          image: "https://boxmob.jp/sp/img/boxer/1601015040.jpg",
          imageSource: "Boxing Mobile"
        }
      }
    ]
  };

  function normalizeFightCards(value) {
    if (!Array.isArray(value)) return [];
    return value
      .map((card) => ({
        bout: String(card?.bout || "").trim(),
        weight: String(card?.weight || "").trim(),
        left: {
          name: String(card?.left?.name || "").trim(),
          ranking: String(card?.left?.ranking || "").trim(),
          profile: String(card?.left?.profile || "").trim(),
          image: String(card?.left?.image || "").trim(),
          imageSource: String(card?.left?.imageSource || "").trim()
        },
        right: {
          name: String(card?.right?.name || "").trim(),
          ranking: String(card?.right?.ranking || "").trim(),
          profile: String(card?.right?.profile || "").trim(),
          image: String(card?.right?.image || "").trim(),
          imageSource: String(card?.right?.imageSource || "").trim()
        }
      }))
      .filter((card) => card.weight || card.left.name || card.right.name);
  }

  function normalizeProductCards(value) {
    if (!Array.isArray(value)) return [];
    return value
      .map((card) => ({
        title: String(card?.title || "").trim().slice(0, 160),
        image: String(card?.image || "").trim(),
        url: String(card?.url || "").trim(),
        price: String(card?.price || "").trim().slice(0, 80),
        checkedAt: String(card?.checkedAt || "").trim().slice(0, 40)
      }))
      .filter((card) => card.title && card.image && card.url)
      .slice(0, 4);
  }

  function getDefaultFightCards(slug) {
    return normalizeFightCards(defaultFightCardsBySlug[slug]).map((card) => ({
      ...card,
      left: { ...card.left },
      right: { ...card.right }
    }));
  }

  let publicArticlesPromise = null;

  function normalizeArticle(row) {
    const storedAffiliateLinks = Array.isArray(row.affiliate_links)
      ? row.affiliate_links
      : [];
    const legacyBoxRecLink = storedAffiliateLinks.find(
      (item) => item && item.type === "boxrec_image" && item.url
    );
    const storedFightCards = storedAffiliateLinks.find(
      (item) => item && item.type === "fight_cards" && Array.isArray(item.cards)
    );
    const storedProductCards = storedAffiliateLinks.find(
      (item) => item && item.type === "product_cards" && Array.isArray(item.cards)
    );
    return {
      id: row.id,
      slug: row.slug,
      title: row.title || "",
      summary: row.summary || "",
      body: row.body || "",
      image: row.image_url || "",
      imagePath: row.image_path || "",
      boxrecUrl: row.boxrec_url || legacyBoxRecLink?.url || "",
      fightCards: normalizeFightCards(storedFightCards?.cards),
      productCards: normalizeProductCards(storedProductCards?.cards),
      accent: row.accent || "red",
      status: row.status || "draft",
      isAdvertorial: Boolean(row.is_advertorial),
      affiliateDisclosure: row.affiliate_disclosure || "",
      affiliateLinks: storedAffiliateLinks.filter(
        (item) => item && item.label && item.url
      ),
      tweets: Array.isArray(row.tweets) ? row.tweets : [],
      youtubeUrls: Array.isArray(row.youtube_urls) ? row.youtube_urls : [],
      instagramUrls: Array.isArray(row.instagram_urls) ? row.instagram_urls : [],
      publishedAt: row.published_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      viewCount: Number(row.view_count || 0),
      uniqueViewCount:
        row.unique_view_count == null
          ? null
          : Number(row.unique_view_count || 0)
    };
  }

  function articleToRow(article) {
    const affiliateLinks = Array.isArray(article.affiliateLinks)
      ? [...article.affiliateLinks].filter((item) => item?.type !== "fight_cards")
      : [];
    if (article.boxrecUrl) {
      affiliateLinks.push({ type: "boxrec_image", url: article.boxrecUrl });
    }
    if (Array.isArray(article.fightCards) && article.fightCards.length) {
      affiliateLinks.push({
        type: "fight_cards",
        cards: normalizeFightCards(article.fightCards)
      });
    }
    const productCards = normalizeProductCards(article.productCards);
    if (productCards.length) {
      affiliateLinks.push({ type: "product_cards", cards: productCards });
    }
    return {
      slug: article.slug,
      title: article.title,
      summary:
        article.summary ||
        String(article.body || article.title || "Article")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 500) ||
        "Article",
      body: article.body,
      image_url: article.image || null,
      image_path: article.imagePath || null,
      boxrec_url: article.boxrecUrl || "",
      accent: "red",
      status: article.status || "draft",
      is_advertorial: Boolean(article.isAdvertorial),
      affiliate_disclosure: article.affiliateDisclosure || "",
      affiliate_links: affiliateLinks,
      tweets: article.tweets || [],
      youtube_urls: article.youtubeUrls || [],
      instagram_urls: article.instagramUrls || [],
      published_at:
        article.status === "published"
          ? article.publishedAt || new Date().toISOString()
          : article.publishedAt || null
    };
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
    const cleanSummaryText = (value) =>
      String(value || "")
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/^\s*[-*+]\s+/gm, "")
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/(\*\*|__|`)(.*?)\1/g, "$2")
        .replace(/https?:\/\/\S+/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
    const paragraphs = text
      .split(/\n\s*\n/)
      .map(cleanSummaryText)
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
    return cleanSummaryText(text)
      .replace(/(?:公式情報|U-NEXT BOXING)\s*[:：]\s*/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);
  }

  async function getArticles({ includeDrafts = false, force = false } = {}) {
    if (!client) {
      return includeDrafts ? [] : [...sampleArticles];
    }

    if (!includeDrafts && publicArticlesPromise && !force) {
      return publicArticlesPromise;
    }

    const request = async () => {
      let query = client.from("articles").select("*").order("published_at", {
        ascending: false,
        nullsFirst: false
      });

      if (!includeDrafts) {
        query = query
          .eq("status", "published")
          .lte("published_at", new Date().toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(normalizeArticle);
    };

    if (includeDrafts) return request();
    publicArticlesPromise = request().catch((error) => {
      publicArticlesPromise = null;
      throw error;
    });
    return publicArticlesPromise;
  }

  async function findArticle(identifier, { includeDrafts = false } = {}) {
    if (!identifier) return null;

    if (!client) {
      return (
        sampleArticles.find(
          (article) => article.slug === identifier || article.id === identifier
        ) || null
      );
    }

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        identifier
      );
    let query = client
      .from("articles")
      .select("*")
      .eq(isUuid ? "id" : "slug", identifier)
      .limit(1);

    if (!includeDrafts) {
      query = query
        .eq("status", "published")
        .lte("published_at", new Date().toISOString());
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data ? normalizeArticle(data) : null;
  }

  async function saveArticle(article) {
    requireConfigured();
    const row = articleToRow(article);

    // Keep existing deployments usable until the schema migration is run.
    const retryWithoutBoxRecColumn = async (operation) => {
      let result = await operation(row);
      if (result.error && /boxrec_url/i.test(String(result.error.message || ""))) {
        const legacyRow = { ...row };
        delete legacyRow.boxrec_url;
        result = await operation(legacyRow);
      }
      return result;
    };

    if (article.id) {
      const { data, error } = await retryWithoutBoxRecColumn((payload) =>
        client
          .from("articles")
          .update(payload)
          .eq("id", article.id)
          .select()
          .single()
      );
      if (error) throw error;
      publicArticlesPromise = null;
      return normalizeArticle(data);
    }

    const { data, error } = await retryWithoutBoxRecColumn((payload) =>
      client.from("articles").insert(payload).select().single()
    );
    if (error) throw error;
    publicArticlesPromise = null;
    return normalizeArticle(data);
  }

  async function deleteArticle(article) {
    requireConfigured();
    const { error } = await client.from("articles").delete().eq("id", article.id);
    if (error) throw error;
    if (article.imagePath) {
      await removeArticleImage(article.imagePath).catch(() => {});
    }
    publicArticlesPromise = null;
  }

  async function getAdminComments() {
    requireConfigured();
    const { data, error } = await client
      .from("comments")
      .select(
        "id,article_id,display_name,body,visitor_id,created_at,articles(title,slug)"
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((comment) => {
      const article = Array.isArray(comment.articles)
        ? comment.articles[0]
        : comment.articles;
      return {
        id: comment.id,
        articleId: comment.article_id,
        articleTitle: article?.title || "削除済みの記事",
        articleSlug: article?.slug || "",
        displayName: comment.display_name,
        body: comment.body,
        visitorId: comment.visitor_id,
        createdAt: comment.created_at
      };
    });
  }

  async function getAdminVisitStats() {
    requireConfigured();
    const now = new Date();
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      })
        .formatToParts(now)
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value])
    );
    const todayStart = `${parts.year}-${parts.month}-${parts.day}T00:00:00+09:00`;
    const monthStart = `${parts.year}-${parts.month}-01T00:00:00+09:00`;
    const [todayResult, monthResult] = await Promise.all([
      client
        .from("site_visitors")
        .select("visitor_hash", { count: "exact", head: true })
        .gte("last_seen", todayStart),
      client
        .from("site_visitors")
        .select("visitor_hash", { count: "exact", head: true })
        .gte("last_seen", monthStart)
    ]);
    if (todayResult.error || monthResult.error) {
      console.warn(
        "Visit stats unavailable:",
        todayResult.error?.message || monthResult.error?.message
      );
      return null;
    }
    return {
      today: Number(todayResult.count || 0),
      month: Number(monthResult.count || 0)
    };
  }

  async function deleteComment(commentId) {
    requireConfigured();
    const { error } = await client.from("comments").delete().eq("id", commentId);
    if (error) throw error;
  }

  async function getSession() {
    if (!client) return null;
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async function getCurrentUser() {
    if (!client) return null;
    const { data, error } = await client.auth.getUser();
    if (error) return null;
    return data.user;
  }

  async function isCurrentUserAdmin() {
    const user = await getCurrentUser();
    if (!user) return false;
    const { data, error } = await client
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) return false;
    return Boolean(data);
  }

  async function signIn(email, password) {
    requireConfigured();
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    if (error) throw error;
    if (!(await isCurrentUserAdmin())) {
      await client.auth.signOut();
      throw new Error("このアカウントには管理者権限がありません。");
    }
    return data.session;
  }

  async function signOut() {
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  async function uploadArticleImage(file, userId) {
    requireConfigured();
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const bucket = supabaseConfig.imageBucket || "article-images";
    const { error } = await client.storage.from(bucket).upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false
    });
    if (error) throw error;

    const { data } = client.storage.from(bucket).getPublicUrl(path);
    return { path, url: data.publicUrl };
  }

  async function removeArticleImage(path) {
    if (!client || !path) return;
    const bucket = supabaseConfig.imageBucket || "article-images";
    const { error } = await client.storage.from(bucket).remove([path]);
    if (error) throw error;
  }

  async function incrementView(slug) {
    if (!client || !slug) return;
    await client.rpc("increment_article_view", { article_slug: slug });
  }

  function articleUrl(article) {
    const slug = encodeURIComponent(article.slug || article.id);
    if (
      window.location.protocol === "file:" ||
      ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ) {
      return `article.html?slug=${slug}`;
    }
    return `/news/${slug}`;
  }

  function articleDate(article) {
    if (!article.publishedAt) return "未公開";
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    })
      .format(new Date(article.publishedAt))
      .replaceAll("/", ".");
  }

  function createSlug(value) {
    const normalized = String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return normalized || `story-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}`;
  }

  function parseUrlList(value, validate) {
    const urls = String(value || "")
      .split(/\r?\n/)
      .map((url) => url.trim())
      .filter(Boolean);
    const invalidUrl = urls.find((url) => !validate(url));
    if (invalidUrl) {
      throw new Error(`対応していないURLです: ${invalidUrl}`);
    }
    return urls;
  }

  function parseBoxRecUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      const url = new URL(raw);
      if (
        url.protocol !== "https:" ||
        !/(^|\.)boxrec\.com$/i.test(url.hostname)
      ) {
        throw new Error();
      }
      return url.href;
    } catch {
      throw new Error("BoxRec URLはhttps://boxrec.com/から入力してください。");
    }
  }

  function parseImageUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      const url = new URL(raw);
      if (url.protocol !== "https:") throw new Error();
      return url.href;
    } catch {
      throw new Error("画像URLはhttps://から入力してください。");
    }
  }

  function parseAffiliateLinks(value) {
    const links = String(value || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf("|");
        if (separator < 1) {
          throw new Error(
            `アフィリエイトリンクは「表示名 | URL」の形式で入力してください: ${line}`
          );
        }
        const label = line.slice(0, separator).trim();
        const url = line.slice(separator + 1).trim();
        if (!label || label.length > 80) {
          throw new Error("アフィリエイトリンクの表示名は1〜80文字で入力してください。");
        }
        if (url.length > 2048) {
          throw new Error("アフィリエイトURLが長すぎます。");
        }
        try {
          const parsed = new URL(url);
          if (parsed.protocol !== "https:") throw new Error();
        } catch {
          throw new Error(`アフィリエイトURLはhttps://から入力してください: ${url}`);
        }
        return { label, url };
      });
    if (links.length > 5) {
      throw new Error("アフィリエイトリンクは1記事につき5件までです。");
    }
    return links;
  }

  function isTweetUrl(value) {
    return /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/[A-Za-z0-9_]+\/status\/\d+(?:\/photo\/\d+)?(?:\?.*)?$/i.test(
      String(value || "").trim()
    );
  }

  function getYouTubeVideoId(value) {
    try {
      const url = new URL(String(value || "").trim());
      const hostname = url.hostname.replace(/^www\./, "");
      if (hostname === "youtu.be") {
        return url.pathname.split("/").filter(Boolean)[0] || "";
      }
      if (["youtube.com", "m.youtube.com"].includes(hostname)) {
        if (url.pathname === "/watch") return url.searchParams.get("v") || "";
        const parts = url.pathname.split("/").filter(Boolean);
        if (["shorts", "embed", "live"].includes(parts[0])) return parts[1] || "";
      }
    } catch {}
    return "";
  }

  function isYouTubeUrl(value) {
    return /^[A-Za-z0-9_-]{6,}$/.test(getYouTubeVideoId(value));
  }

  function isInstagramUrl(value) {
    try {
      const url = new URL(String(value || "").trim());
      const hostname = url.hostname.replace(/^www\./, "");
      const parts = url.pathname.split("/").filter(Boolean);
      return (
        hostname === "instagram.com" &&
        ["p", "reel", "tv"].includes(parts[0]) &&
        Boolean(parts[1])
      );
    } catch {
      return false;
    }
  }

  function requireConfigured() {
    if (!client) {
      throw new Error(
        "Supabaseが未設定です。config.jsとsupabase/schema.sqlの設定を完了してください。"
      );
    }
  }

  window.BoxingData = {
    configured: isConfigured,
    client,
    sampleArticles,
    getArticles,
    findArticle,
    saveArticle,
    deleteArticle,
    getAdminComments,
    getAdminVisitStats,
    deleteComment,
    getSession,
    getCurrentUser,
    isCurrentUserAdmin,
    signIn,
    signOut,
    uploadArticleImage,
    removeArticleImage,
    incrementView,
    articleUrl,
    articleDate,
    articleSummary,
    createSlug,
    parseUrlList,
    parseBoxRecUrl,
    parseImageUrl,
    getDefaultFightCards,
    normalizeFightCards,
    affiliateProductPool,
    selectAffiliateProductCards,
    selectRelevantAffiliateProductCards,
    parseAffiliateLinks,
    isTweetUrl,
    getYouTubeVideoId,
    isYouTubeUrl,
    isInstagramUrl
  };
})();
