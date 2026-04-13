"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "../page.module.css";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("pl-PL", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function PostCard({ post, onApprove, onReject }) {
  const [caption, setCaption] = useState(post.caption || "");
  const [state, setState] = useState("idle"); // idle | approving | rejecting | error
  const [errorMsg, setErrorMsg] = useState("");

  const coverImage = post.image_url || post.slides?.[0]?.image_url;
  const isCarousel = post.type === "carousel";
  const slideCount = post.slides?.length ?? 0;

  async function handleApprove() {
    setState("approving");
    setErrorMsg("");
    const result = await onApprove({ ...post, caption });
    if (result?.error) {
      setState("error");
      setErrorMsg(result.error);
    }
    // on success the card is removed by the parent
  }

  async function handleReject() {
    setState("rejecting");
    await onReject(post);
  }

  return (
    <article className={styles.card}>
      <div className={styles.cardImage}>
        {coverImage
          ? <img src={coverImage} alt="Podgląd posta" />
          : <div className={styles.noImage}>Brak grafiki</div>
        }
        <span className={styles.typeBadge}>
          {isCarousel ? `Karuzela · ${slideCount} slajdy` : "Post"}
        </span>
      </div>

      <div className={styles.cardBody}>
        {post.topic && <div className={styles.topic}>{post.topic}</div>}

        <textarea
          className={styles.caption}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={6}
          placeholder="Caption (edytowalny przed publikacją)…"
        />

        {post.tags?.length > 0 && (
          <div className={styles.tags}>{post.tags.join(" ")}</div>
        )}

        {post.created_at && (
          <div className={styles.date}>{formatDate(post.created_at)}</div>
        )}

        {state === "error" && (
          <div className={styles.errorMsg}>❌ {errorMsg}</div>
        )}

        <div className={styles.actions}>
          <button
            className={styles.btnApprove}
            onClick={handleApprove}
            disabled={state !== "idle" && state !== "error"}
          >
            {state === "approving" ? "Publikowanie…" : "✓ Zatwierdź i opublikuj"}
          </button>
          <button
            className={styles.btnReject}
            onClick={handleReject}
            disabled={state !== "idle" && state !== "error"}
          >
            {state === "rejecting" ? "…" : "✕"}
          </button>
        </div>
      </div>
    </article>
  );
}

/**
 * @param {{ initialPosts: import("../page").Post[] }} props
 */
export default function PostGrid({ initialPosts }) {
  const router = useRouter();

  // Dane startowe przychodzą z SSR — nie ma potrzeby inicjalnego fetcha
  const [posts, setPosts] = useState(initialPosts);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/posts?status=pending");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Błąd ładowania");
      setPosts(data);
      setLastRefresh(new Date());
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  async function approve(post) {
    // optimistic remove
    setPosts((prev) => prev.filter((p) => p.id !== post.id));

    const res = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: post.id,
        type: post.type,
        caption: post.caption,
        tags: post.tags,
        image_url: post.image_url,
        slides: post.slides,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      // przywróć kartę z błędem
      setPosts((prev) => [post, ...prev]);
      return { error: data.error || "Nieznany błąd publikacji" };
    }
    return { publishedId: data.publishedId };
  }

  async function reject(post) {
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    await fetch("/api/posts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: post.id, status: "rejected" }),
    });
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <img src="/logo.svg" alt="Inspirio" className={styles.logo} />
          <span className={styles.title}>Inspirio</span>
          <span className={styles.subtitle}>Panel zatwierdzania</span>
        </div>
        <div className={styles.headerRight}>
          {lastRefresh && (
            <span className={styles.refreshTime}>
              odświeżono {lastRefresh.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button className={styles.btnRefresh} onClick={loadPosts} disabled={loading}>
            {loading ? "⟳" : "Odśwież"}
          </button>
          <button className={styles.btnLogout} onClick={logout}>
            Wyloguj
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {fetchError && (
          <div className={styles.errorState}>
            <span>❌ {fetchError}</span>
            <button onClick={loadPosts}>Spróbuj ponownie</button>
          </div>
        )}

        {loading && posts.length === 0 && (
          <div className={styles.center}><p>Ładowanie postów…</p></div>
        )}

        {!loading && !fetchError && posts.length === 0 && (
          <div className={styles.center}>
            <p>Brak postów oczekujących na zatwierdzenie</p>
            <p className={styles.hint}>
              Uruchom <code>npm run generate</code> żeby wygenerować nowe treści
            </p>
          </div>
        )}

        <div className={styles.grid}>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onApprove={approve}
              onReject={reject}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

