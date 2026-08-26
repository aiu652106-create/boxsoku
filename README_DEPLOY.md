# 公開手順

このサイトはレンタルサーバーを使いません。

- ドメイン取得: XServerドメイン
- サイト公開: Cloudflare Pages
- 記事DB、管理者ログイン、画像: Supabase

## 1. Supabaseを作成

1. Supabaseで新規プロジェクトを作成します。
2. SQL Editorで `supabase/schema.sql` を実行します。
3. Authentication > Usersで管理者ユーザーを作成します。
4. 作成したユーザーのUUIDを確認し、SQL Editorで次を実行します。

```sql
insert into public.admin_users (user_id, email)
values ('管理者ユーザーのUUID', '管理者メールアドレス');
```

5. Project Settings > APIで次の2つを確認します。

- Project URL
- Publishable keyまたはanon public key

`service_role`キーは絶対にブラウザやリポジトリへ入れないでください。

既に初期設定済みのサイトへコメント機能を追加する場合も、
更新後の `supabase/schema.sql` をSQL Editorでもう一度実行してください。
既存の記事データは削除されません。
サイトアイコン設定を追加する場合も、同じSQLをもう一度実行すると
`site_settings`テーブルと必要な権限が追加されます。

## 2. `config.js`を設定

以下を実際の値へ変更します。

```js
site: {
  name: "サイト名",
  tagline: "サイト説明",
  url: "https://boxsoku.com",
  contactEmail: "連絡先メール"
},
supabase: {
  url: "https://mowosdkvlrrrrevgrqkw.supabase.co",
  anonKey: "sb_publishable_DoXlNgEPi5sF6nut9pkMxw_82jRYvm_",
  imageBucket: "article-images"
}
```

公開キーはブラウザで利用する前提のキーです。安全性は
`supabase/schema.sql`で設定したRLSによって確保します。

## 3. Cloudflare Pagesへ公開

Pages Functionsを使用するため、GitHub連携での公開を推奨します。

1. このフォルダをGitHubリポジトリへ登録します。
2. CloudflareのWorkers & PagesからPagesプロジェクトを作成します。
3. GitHubリポジトリを接続します。
4. Framework presetは `None`、Build commandは空欄、出力先は `.` にします。
5. Settings > Variables and Secretsへ次を登録します。

| 変数 | 値 |
| --- | --- |
| `SUPABASE_URL` | `https://mowosdkvlrrrrevgrqkw.supabase.co` |
| `SUPABASE_ANON_KEY` | `sb_publishable_DoXlNgEPi5sF6nut9pkMxw_82jRYvm_` |
| `SITE_URL` | `https://boxsoku.com` |
| `COMMENT_ID_SALT` | Cloudflare PagesのSecretとして登録（値はリポジトリに記載しない） |
| `SITE_NAME` | サイト名（未設定時は「ボクシング速報」） |
| `VISITOR_ID_SALT` | Cloudflare PagesのSecretとして登録（COMMENT_ID_SALTとは別の値） |
| `BOXSOKU_SERVER_TOKEN` | Cloudflare PagesのSecretとして登録（Supabase RPCのサーバー間認証用） |
| `ADSENSE_PUBLISHER_ID` | AdSense承認後の`pub-`から始まるサイト運営者ID |

再デプロイ後、`/news/記事slug`と`/sitemap.xml`がFunctionsから生成されます。
記事ページのコメント投稿は`/api/comments`を通してSupabaseへ保存されます。

コメント投稿と記事PV記録のサーバー間認証には、Cloudflare PagesのSecret `BOXSOKU_SERVER_TOKEN`を使います。Supabaseの`public.server_secrets`には、同じ値をリポジトリへ書かず、SQL EditorでSHA-256ハッシュとして登録してください。

```sql
insert into public.server_secrets (id, token_hash)
values ('boxsoku', encode(extensions.digest(convert_to('CloudflareのBOXSOKU_SERVER_TOKENと同じ値', 'UTF8'), 'sha256'), 'hex'))
on conflict (id) do update
set token_hash = excluded.token_hash, updated_at = now();
```

## 4. XServerドメインをCloudflareへ接続

1. Cloudflareで取得済みドメインを追加します。
2. Cloudflareから指定された2つのネームサーバーを確認します。
3. XServerドメインのネームサーバー設定を、Cloudflare指定値へ変更します。
4. Cloudflare Pages > Custom domainsから取得したドメインを追加します。

ルートドメインをPagesで使う場合、ドメインをCloudflare zoneとして追加し、
ネームサーバーをCloudflareへ向ける必要があります。

## 5. 管理画面

公開後、次のURLからログインします。

```text
https://boxsoku.com/admin
```

Supabase Authenticationで作成したメールアドレスとパスワードを使用します。
記事画像はSupabase Storageの`article-images`へ保存されます。
サイトアイコンは管理画面の「サイト設定」からURL入力または画像アップロードで変更できます。

## 6. AdSense

審査前:

1. 独自記事を十分に公開します。
2. `about.html`、`privacy.html`、`disclaimer.html`、`contact.html`を確認します。
3. `config.js`の連絡先やサイトURLを実値へ変更します。

承認後:

1. `config.js`の`adsense.client`へ`ca-pub-`から始まるIDを設定します。
2. `config.js`の各広告枠IDを設定します。記事中段枠は本文が4段落以上のときだけ表示されます。
3. Cloudflare Pagesの`ADSENSE_PUBLISHER_ID`へ`pub-`から始まるIDを設定します。
   `/ads.txt`はPages Functionから自動生成され、未設定時は偽の販売者IDを出しません。
4. EEA、英国、スイスのユーザーへ広告を表示する場合は、AdSenseの
   「プライバシーとメッセージ」でGoogle認定CMPを設定します。

## 7. アフィリエイト

配信サービスのアフィリエイトリンクを含む記事では、編集画面の
「この記事に配信サービスのアフィリエイトリンクを含む」を有効にします。
リンクを1件以上登録すると自動で有効になり、記事冒頭へPR表記が表示されます。

リンクは編集画面で、1行につき次の形式で登録します。

```text
配信サイトで視聴する | https://広告リンク
```

URLは`https://`から入力し、1記事につき5件まで登録できます。公開ページでは
`rel="sponsored"`が自動付与され、料金・配信条件の確認文も表示されます。

## 8. 興行自動更新（候補保存・手動承認）

興行自動更新を使う場合は、まず通常の`supabase/schema.sql`を実行し、続けて
`supabase/event-automation-2026-08-26.sql`をSupabase SQL Editorで実行します。
この追加SQLは既存記事を削除・公開・上書きしません。取得結果は
`event_update_candidates`へ保存され、管理者が`event-updates.html`で承認した場合だけ
正規イベント情報へ反映されます。新規イベントの公開には、公開済み記事の選択と
「承認して公開」操作が必要です。

Cloudflare Pages Functionsにはこのリポジトリ独自の定期実行機能を置いていないため、
外部Cronなどから1日1回、次のリクエストを送ります。トークンはリポジトリへ保存せず、
Cloudflare Pages Secretの`BOXSOKU_SERVER_TOKEN`と同じ値を使います。

```text
POST https://boxsoku.com/api/event-sync
X-Boxsoku-Event-Sync-Token: <BOXSOKU_SERVER_TOKEN>
Content-Type: application/json

{}
```

公式ソースは初期状態でLemino BOXING公式とDANGAN公式を対象にします。ソースごとに
1回ずつ順番に取得し、通常は1ドメインにつき1リクエストです。タイムアウトと5xxは
設定された最大1回まで再試行し、403・429は再試行せず停止します。連続3回の失敗で
サーキットブレーカーが停止状態になります。同期ロックは15分、管理画面の手動確認も
DB側のクールダウン（初期30分）に従います。

候補へ保存するのはイベント名、日付、会場、開始時刻、配信サービス、明示された対戦
カードなどの正規化項目だけです。取得HTML、script、style、iframeは保存しません。
カード順やメイン・セミの明示がない情報は推測せず、要確認として扱います。公式ページ
から情報が消えた場合やカード数が急減した場合も、最後に正常確認できた正規イベントを
自動削除せず、候補を要確認にします。

取得ログと候補は`event-updates.html`（管理者専用）で確認できます。既存の記事本文、
アイキャッチ、選手DB、興行記事の手入力データは自動取得では変更しません。公開ページの
「確認済み興行情報」は、イベントを記事へ紐付けて明示的に公開した場合だけ表示されます。
