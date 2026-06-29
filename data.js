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

  let publicArticlesPromise = null;

  function normalizeArticle(row) {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title || "",
      summary: row.summary || "",
      body: row.body || "",
      image: row.image_url || "",
      imagePath: row.image_path || "",
      accent: row.accent || "red",
      status: row.status || "draft",
      isAdvertorial: Boolean(row.is_advertorial),
      affiliateDisclosure: row.affiliate_disclosure || "",
      affiliateLinks: Array.isArray(row.affiliate_links) ? row.affiliate_links : [],
      tweets: Array.isArray(row.tweets) ? row.tweets : [],
      youtubeUrls: Array.isArray(row.youtube_urls) ? row.youtube_urls : [],
      instagramUrls: Array.isArray(row.instagram_urls) ? row.instagram_urls : [],
      publishedAt: row.published_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      viewCount: Number(row.view_count || 0)
    };
  }

  function articleToRow(article) {
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
      accent: "red",
      status: article.status || "draft",
      is_advertorial: Boolean(article.isAdvertorial),
      affiliate_disclosure: article.affiliateDisclosure || "",
      affiliate_links: article.affiliateLinks || [],
      tweets: article.tweets || [],
      youtube_urls: article.youtubeUrls || [],
      instagram_urls: article.instagramUrls || [],
      published_at:
        article.status === "published"
          ? article.publishedAt || new Date().toISOString()
          : article.publishedAt || null
    };
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

    if (article.id) {
      const { data, error } = await client
        .from("articles")
        .update(row)
        .eq("id", article.id)
        .select()
        .single();
      if (error) throw error;
      publicArticlesPromise = null;
      return normalizeArticle(data);
    }

    const { data, error } = await client
      .from("articles")
      .insert(row)
      .select()
      .single();
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
    createSlug,
    parseUrlList,
    parseAffiliateLinks,
    isTweetUrl,
    getYouTubeVideoId,
    isYouTubeUrl,
    isInstagramUrl
  };
})();
