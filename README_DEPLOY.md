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
| `COMMENT_ID_SALT` | `8800a06c277946f49341cdbad691175c0c424a7502e34e24b68567e72afd6bf0` |
| `SITE_NAME` | サイト名（未設定時は「ボクシング速報」） |
| `COMMENT_ID_SALT` | 推測されにくい任意の長い文字列 |
| `ADSENSE_PUBLISHER_ID` | AdSense承認後の`pub-`から始まるサイト運営者ID |

再デプロイ後、`/news/記事slug`と`/sitemap.xml`がFunctionsから生成されます。
記事ページのコメント投稿は`/api/comments`を通してSupabaseへ保存されます。

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
