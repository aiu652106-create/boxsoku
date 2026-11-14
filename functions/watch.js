import { officialAnnouncementsHtml } from "../viewing-guide.js";
import { securityHeaders } from "./_shared/security.js";

export function onRequestGet({ request }) {
  const html = `<!doctype html><html lang="ja"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ボクシングの視聴方法｜配信先・料金・見逃しの確認ガイド | ボクシング速報</title>
  <meta name="description" content="ボクシングをどこで見られるか、無料・月額・追加料金の違い、テレビ視聴や見逃し配信の確認方法を案内します。">
  <link rel="canonical" href="https://boxsoku.com/watch">
  <meta property="og:type" content="website"><meta property="og:title" content="ボクシングの視聴方法 | ボクシング速報">
  <meta property="og:url" content="https://boxsoku.com/watch"><meta property="og:description" content="配信先・料金・見逃しの確認ガイド">
  <meta property="og:image" content="https://boxsoku.com/assets/boxsoku-icon.png"><meta name="twitter:card" content="summary">
  <link rel="icon" type="image/png" href="/assets/boxsoku-icon.png">
  <link rel="stylesheet" href="/styles.css?v=20260814-tablet-fix8"><link rel="stylesheet" href="/viewing-guide.css?v=20261115">
  <script src="/site-events.js?v=20261115-path-only" defer></script></head>
  <body class="retro-blog"><div class="retro-top"><div><span>ボクシングの試合予定と配信情報</span><a href="/about">運営者情報</a></div></div>
  <header class="retro-header"><a class="retro-logo" href="/"><strong>ボクシング速報</strong><span>BOXING NEWS</span></a></header>
  <main class="policy-page"><article class="policy-card"><nav class="public-breadcrumb" aria-label="パンくずリスト"><a href="/">ホーム</a> &gt; 視聴方法</nav>
  <h1>ボクシングの視聴方法</h1><p>見たい興行の配信先と対象プランを確認してから、視聴手続きを進めましょう。</p>
  <nav class="watch-links" aria-label="視聴情報"><a href="/boxing-broadcast">放送・配信予定を探す</a><a href="/schedule">全カード・興行日程を探す</a></nav>
  ${officialAnnouncementsHtml()}
  <section class="watch-service-help"><h2>1. 見たい興行の配信先を確認する</h2>
  <p>同じ選手の試合でも、興行によって配信先が変わる場合があります。まず各興行の記事と公式の大会情報で、今回の配信先を確認してください。</p>
  <div class="watch-links"><a href="/lemino-boxing">Leminoの興行情報</a><a href="/wowow-excite-match">WOWOWの放送情報</a></div></section>
  <section class="watch-service-help"><h2>2. 無料・月額・追加料金を確認する</h2>
  <p>無料配信、月額プランの対象、別途購入が必要な配信はそれぞれ条件が異なります。「初月無料」と書かれていても、すべての興行が無料で見られるとは限りません。</p>
  <p>既に契約中の方は、新しく申し込む前に対象プランかどうかを確認してください。携帯電話の料金プランなどに付く特典で視聴できる場合もあります。利用料金・更新日・追加購入の有無は公式の申込画面でご確認ください。</p></section>
  <section class="watch-service-help"><h2>3. 開始時刻と視聴環境を確認する</h2>
  <p>開場、興行開始、配信開始、メインイベントの開始は別の時刻です。メインの時刻が公表されていない場合、前の試合の進行によって変わります。海外興行は日本時間を確認してください。</p>
  <p>テレビで見たい方は、利用するテレビ・配信端末がサービスに対応しているかを公式ヘルプで確認し、事前にログインと再生を試しておくと安心です。</p></section>
  <section class="watch-service-help"><h2>4. 見逃し配信は期間まで確認する</h2>
  <p>ライブ配信があっても、見逃し配信が必ずあるとは限りません。配信終了日、対象プラン、追加購入の必要性は興行ごとに確認してください。過去記事の配信リンクは、現在の配信を保証するものではありません。</p></section>
  <p class="watch-note">PRと表示したリンクはアフィリエイトリンクです。申込み等により当サイトが紹介料を受け取る場合があります。</p>
  <p><a href="/boxing-broadcast">放送・配信予定へ戻る</a></p></article></main>
  <footer class="retro-footer"><a href="/">TOP PAGEへ</a><nav><a href="/about">運営者情報</a><a href="/privacy">プライバシーポリシー</a><a href="/disclaimer">免責事項</a><a href="/contact">お問い合わせ</a></nav></footer></body></html>`;
  return new Response(request.method === "HEAD" ? null : html, {
    headers: securityHeaders({ "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=300, s-maxage=300" })
  });
}

export const onRequestHead = onRequestGet;
