"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  MessageCircle,
  Play,
  Plus,
  Repeat2,
  Send,
  Share2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { optimizedImage } from "@/lib/image";

export type ReelComment = {
  id?: string;
  clerkId?: string;
  name: string;
  text: string;
  createdAt?: string;
};

export type ReelItem = {
  id: string;
  src: string;
  kind?: "image" | "video";
  poster?: string;
  authorName: string;
  authorAvatar?: string;
  authorId?: string;
  subtitle?: string;
  caption?: string;
  createdAt?: string;
  badge?: string;
  likes?: string[];
  comments?: ReelComment[];
  reposts?: string[];
  href?: string;
};

type ReelsFeedProps = {
  items: ReelItem[];
  currentUserId?: string;
  onLike?: (item: ReelItem, liked: boolean) => void;
  onComment?: (item: ReelItem, text: string) => Promise<void> | void;
  onRepost?: (item: ReelItem) => void;
  onShare?: (item: ReelItem) => void;
  storiesTitle?: string;
  onAddStory?: () => void;
  layout?: "feed" | "grid";
  emptyState?: React.ReactNode;
  initialOpenId?: string;
};

const timeAgo = (value?: string) => {
  if (!value) return "";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(1, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(value).toLocaleDateString();
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "D";

function Avatar({ src, name, size = 36 }: { src?: string; name: string; size?: number }) {
  return src ? (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className="rounded-full object-cover ring-2 ring-white"
      style={{ width: size, height: size }}
      loading="lazy"
    />
  ) : (
    <span
      className="flex items-center justify-center rounded-full bg-emerald-100 font-black text-emerald-800 ring-2 ring-white"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}

function Media({
  item,
  muted,
  onEnded,
  onProgress,
  onToggleMute,
}: {
  item: ReelItem;
  muted: boolean;
  onEnded?: () => void;
  onProgress?: (percent: number) => void;
  onToggleMute?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.play().catch(() => {});
    setPaused(false);
  }, [item.id]);

  if (item.kind === "video") {
    return (
      <div className="relative h-full w-full bg-black">
        <video
          ref={videoRef}
          src={item.src}
          poster={item.poster}
          className="reel-media"
          muted={muted}
          playsInline
          preload="metadata"
          onEnded={onEnded}
          onTimeUpdate={(event) => {
            const el = event.currentTarget;
            if (el.duration) onProgress?.((el.currentTime / el.duration) * 100);
          }}
          onClick={() => {
            const el = videoRef.current;
            if (!el) return;
            if (el.paused) {
              el.play().catch(() => {});
              setPaused(false);
            } else {
              el.pause();
              setPaused(true);
            }
          }}
        />
        {paused ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-black/45 p-4 text-white backdrop-blur">
              <Play className="h-7 w-7 fill-current" />
            </span>
          </span>
        ) : null}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleMute?.();
          }}
          className="absolute right-3 top-3 z-10 rounded-full bg-black/45 p-2 text-white backdrop-blur transition hover:bg-black/70"
          aria-label={muted ? "Unmute video" : "Mute video"}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>
    );
  }

  return (
    <img
      src={optimizedImage(item.src, 1200)}
      alt={item.caption || `${item.authorName} nature snap`}
      className="reel-media"
      loading="lazy"
      decoding="async"
    />
  );
}

function ActionButton({
  label,
  count,
  active,
  onClick,
  children,
}: {
  label: string;
  count?: number;
  active?: boolean;
  onClick: (event: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`group flex flex-col items-center gap-1 text-white transition ${
        active ? "text-rose-300" : "hover:text-lime-200"
      }`}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/15 backdrop-blur transition active:scale-90 ${
          active ? "bg-rose-500/90" : "bg-white/10 group-hover:bg-white/20"
        }`}
      >
        {children}
      </span>
      {typeof count === "number" ? (
        <span className="text-[11px] font-bold tabular-nums drop-shadow">{count}</span>
      ) : (
        <span className="text-[10px] font-semibold drop-shadow">{label}</span>
      )}
    </button>
  );
}

export default function ReelsFeed({
  items,
  currentUserId,
  onLike,
  onComment,
  onRepost,
  onShare,
  storiesTitle = "Stories",
  onAddStory,
  layout = "feed",
  emptyState,
  initialOpenId,
}: ReelsFeedProps) {
  const [local, setLocal] = useState<ReelItem[]>(items);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [sheetFor, setSheetFor] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [burst, setBurst] = useState("");
  const imageTimer = useRef<number | null>(null);
  const openedInitial = useRef(false);

  useEffect(() => {
    setLocal(items);
  }, [items]);

  useEffect(() => {
    if (!initialOpenId || openedInitial.current) return;
    const index = items.findIndex((item) => item.id === initialOpenId);
    if (index >= 0) {
      openedInitial.current = true;
      setOpenIndex(index);
    }
  }, [initialOpenId, items]);

  const current = openIndex !== null ? local[openIndex] : null;

  const close = useCallback(() => {
    setOpenIndex(null);
    setSheetFor(null);
    setDraft("");
  }, []);

  const step = useCallback(
    (direction: 1 | -1) => {
      setProgress(0);
      setOpenIndex((index) => {
        if (index === null) return index;
        const next = index + direction;
        if (next < 0) return local.length - 1;
        if (next >= local.length) return 0;
        return next;
      });
    },
    [local.length]
  );

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, close, step]);

  useEffect(() => {
    // Pause auto-advance while the member is reading or writing a comment.
    if (openIndex === null || !current || sheetFor) return;
    if (current.kind === "video") return;
    if (imageTimer.current) window.clearTimeout(imageTimer.current);

    setProgress(0);
    const started = Date.now();
    const tick = window.setInterval(() => {
      setProgress(Math.min(100, ((Date.now() - started) / 6500) * 100));
    }, 100);
    imageTimer.current = window.setTimeout(() => step(1), 6500);

    return () => {
      window.clearInterval(tick);
      if (imageTimer.current) window.clearTimeout(imageTimer.current);
    };
  }, [openIndex, current, step, sheetFor]);

  const patch = (id: string, updater: (item: ReelItem) => ReelItem) =>
    setLocal((list) => list.map((item) => (item.id === id ? updater(item) : item)));

  const toggleLike = (item: ReelItem) => {
    const likes = item.likes || [];
    const liked = !!currentUserId && likes.includes(currentUserId);
    const nextLikes = liked
      ? likes.filter((id) => id !== currentUserId)
      : currentUserId
        ? [...likes, currentUserId]
        : likes;
    patch(item.id, (entry) => ({ ...entry, likes: nextLikes }));
    if (!liked) {
      setBurst(item.id);
      window.setTimeout(() => setBurst(""), 900);
    }
    onLike?.(item, !liked);
  };

  const toggleRepost = (item: ReelItem) => {
    const reposts = item.reposts || [];
    const done = !!currentUserId && reposts.includes(currentUserId);
    patch(item.id, (entry) => ({
      ...entry,
      reposts: done
        ? reposts.filter((id) => id !== currentUserId)
        : currentUserId
          ? [...reposts, currentUserId]
          : reposts,
    }));
    onRepost?.(item);
  };

  const share = async (item: ReelItem) => {
    const url = `${window.location.origin}${item.href || "/nature-snaps"}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.caption || "DEKUWEC",
          text: item.caption || item.authorName,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* dismissed */
    }
    onShare?.(item);
  };

  const submitComment = async (item: ReelItem) => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    const optimistic: ReelComment = {
      id: `local-${Date.now()}`,
      clerkId: currentUserId,
      name: "You",
      text,
      createdAt: new Date().toISOString(),
    };
    patch(item.id, (entry) => ({ ...entry, comments: [...(entry.comments || []), optimistic] }));
    setDraft("");
    try {
      await onComment?.(item, text);
    } finally {
      setSending(false);
    }
  };

  const cardActions = (item: ReelItem) => {
    const likes = item.likes || [];
    const liked = !!currentUserId && likes.includes(currentUserId);
    const comments = item.comments || [];
    const reposted = !!currentUserId && (item.reposts || []).includes(currentUserId);
    return (
      <div className="flex items-center gap-4 border-t border-emerald-50 px-4 py-3">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            toggleLike(item);
          }}
          className={`inline-flex items-center gap-1.5 text-sm font-bold transition ${
            liked ? "text-rose-600" : "text-slate-600 hover:text-rose-600"
          }`}
          aria-label={liked ? "Unlike" : "Like"}
        >
          <Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} />
          <span className="tabular-nums">{likes.length}</span>
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setOpenIndex(local.findIndex((entry) => entry.id === item.id));
            setSheetFor(item.id);
          }}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 transition hover:text-emerald-700"
          aria-label="Comments"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="tabular-nums">{comments.length}</span>
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            toggleRepost(item);
          }}
          className={`inline-flex items-center gap-1.5 text-sm font-bold transition ${
            reposted ? "text-emerald-700" : "text-slate-600 hover:text-emerald-700"
          }`}
          aria-label="Repost"
        >
          <Repeat2 className="h-5 w-5" />
          <span className="tabular-nums">{(item.reposts || []).length}</span>
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            share(item);
          }}
          className="ml-auto inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 transition hover:text-emerald-700"
          aria-label="Share"
        >
          <Share2 className="h-5 w-5" />
        </button>
      </div>
    );
  };

  if (local.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-[0.16em] text-emerald-900">{storiesTitle}</h2>
          {onAddStory ? (
            <button
              type="button"
              onClick={onAddStory}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Add yours
            </button>
          ) : null}
        </div>

        <div className="scrollbar-hide -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
          {local.map((item, index) => (
            <button
              key={`story-${item.id}`}
              type="button"
              onClick={() => {
                setOpenIndex(index);
                setProgress(0);
              }}
              className="group flex w-[74px] shrink-0 flex-col items-center gap-1.5"
            >
              <span className="story-ring rounded-full p-[3px] transition group-hover:scale-105">
                <span className="block rounded-full bg-white p-[3px]">
                  <span className="relative block h-16 w-16 overflow-hidden rounded-full bg-emerald-100">
                    {item.kind === "video" ? (
                      <video
                        src={item.src}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={optimizedImage(item.src, 160)}
                        alt={item.authorName}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    )}
                    {item.kind === "video" ? (
                      <span className="absolute bottom-1 right-1 rounded-full bg-black/60 p-0.5 text-white">
                        <Play className="h-2.5 w-2.5 fill-current" />
                      </span>
                    ) : null}
                  </span>
                </span>
              </span>
              <span className="w-full truncate text-center text-[11px] font-semibold text-emerald-950">
                {item.authorName.split(" ")[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {layout === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {local.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setOpenIndex(index);
                setProgress(0);
              }}
              className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-emerald-950 text-left"
            >
              {item.kind === "video" ? (
                <video src={item.src} className="h-full w-full object-cover" muted playsInline preload="metadata" />
              ) : (
                <img
                  src={optimizedImage(item.src, 600)}
                  alt={item.caption || item.authorName}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <span className="absolute bottom-2 left-2 right-2 line-clamp-2 text-[11px] font-bold text-white">
                {item.caption || item.authorName}
              </span>
              {item.kind === "video" ? (
                <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white">
                  12s
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {local.map((item, index) => {
            const liked = !!currentUserId && (item.likes || []).includes(currentUserId);
            return (
              <article
                key={item.id}
                className="card card-hover animate-rise overflow-hidden"
                style={{ animationDelay: `${Math.min(index, 5) * 45}ms` }}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="story-ring rounded-full p-[2px]">
                    <span className="block rounded-full bg-white p-[2px]">
                      <Avatar src={item.authorAvatar} name={item.authorName} size={34} />
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 truncate text-sm font-bold text-emerald-950">
                      {item.authorName}
                      <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    </p>
                    <p className="truncate text-[11px] text-muted">
                      {item.badge || item.subtitle || "DEKUWEC member"}
                      {timeAgo(item.createdAt) ? ` · ${timeAgo(item.createdAt)}` : ""}
                    </p>
                  </div>
                  {item.kind === "video" ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                      Reel
                    </span>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setOpenIndex(index);
                    setProgress(0);
                  }}
                  onDoubleClick={() => toggleLike(item)}
                  className="relative block aspect-[4/5] w-full overflow-hidden bg-emerald-950"
                >
                  {item.kind === "video" ? (
                    <video
                      src={item.src}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={optimizedImage(item.src, 800)}
                      alt={item.caption || item.authorName}
                      className="h-full w-full object-cover transition duration-700 hover:scale-[1.03]"
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                  {liked ? (
                    <Heart className="absolute right-3 top-3 h-5 w-5 fill-rose-500 text-rose-500 drop-shadow" />
                  ) : null}
                  <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
                    <Play className="h-3 w-3 fill-current" />
                    {item.kind === "video" ? "Watch reel" : "View story"}
                  </span>
                </button>

                {item.caption ? (
                  <p className="line-clamp-2 px-4 pt-3 text-sm leading-relaxed text-slate-600">{item.caption}</p>
                ) : null}

                {cardActions(item)}
              </article>
            );
          })}
        </div>
      )}

      {current ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 sm:p-6">
          <button
            type="button"
            onClick={close}
            aria-label="Close reels"
            className="absolute inset-0 h-full w-full cursor-default"
          />

          <div className="relative z-10 flex h-[100dvh] w-full max-w-[440px] flex-col overflow-hidden bg-black sm:h-[86vh] sm:rounded-[2rem]">
            <div className="absolute inset-x-0 top-0 z-20 flex gap-1 p-2">
              {local.map((entry, index) => (
                <span key={`bar-${entry.id}`} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
                  <span
                    className="block h-full rounded-full bg-white"
                    style={{
                      width:
                        index < (openIndex ?? 0)
                          ? "100%"
                          : index === openIndex
                            ? `${progress}%`
                            : "0%",
                    }}
                  />
                </span>
              ))}
            </div>

            <div className="relative flex-1 overflow-hidden">
              <Media
                item={current}
                muted={muted}
                onEnded={() => step(1)}
                onProgress={setProgress}
                onToggleMute={() => setMuted((value) => !value)}
              />

              <span className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/75 to-transparent" />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />

              {burst === current.id ? (
                <Heart className="animate-heart pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 fill-rose-500 text-rose-500" />
              ) : null}

              <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2.5 px-4 pt-5">
                <Avatar src={current.authorAvatar} name={current.authorName} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-sm font-bold text-white">
                    {current.authorName}
                    <BadgeCheck className="h-3.5 w-3.5 text-lime-300" />
                  </p>
                  <p className="truncate text-[11px] text-white/70">
                    {current.badge || current.subtitle || timeAgo(current.createdAt) || "DEKUWEC"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-full bg-white/15 p-2 text-white backdrop-blur transition hover:bg-white/25"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous"
                className="absolute left-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-black/35 p-2 text-white backdrop-blur transition hover:bg-black/60 sm:block"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next"
                className="absolute right-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-black/35 p-2 text-white backdrop-blur transition hover:bg-black/60 sm:block"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div className="absolute bottom-24 right-3 z-20 flex flex-col items-center gap-4">
                <ActionButton
                  label="Like"
                  count={(current.likes || []).length}
                  active={!!currentUserId && (current.likes || []).includes(currentUserId)}
                  onClick={() => toggleLike(current)}
                >
                  <Heart
                    className={`h-5 w-5 ${
                      currentUserId && (current.likes || []).includes(currentUserId) ? "fill-current" : ""
                    }`}
                  />
                </ActionButton>
                <ActionButton
                  label="Comment"
                  count={(current.comments || []).length}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSheetFor(current.id);
                  }}
                >
                  <MessageCircle className="h-5 w-5" />
                </ActionButton>
                <ActionButton
                  label="Repost"
                  count={(current.reposts || []).length}
                  active={!!currentUserId && (current.reposts || []).includes(currentUserId)}
                  onClick={() => toggleRepost(current)}
                >
                  <Repeat2 className="h-5 w-5" />
                </ActionButton>
                <ActionButton label="Share" onClick={() => share(current)}>
                  <Share2 className="h-5 w-5" />
                </ActionButton>
              </div>

              <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-5 pr-20">
                {current.caption ? (
                  <p className="line-clamp-3 text-sm leading-snug text-white">{current.caption}</p>
                ) : null}
                {current.href ? (
                  <a
                    href={current.href}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-lime-300 hover:text-lime-200"
                  >
                    Open full details <ChevronRight className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>
            </div>

            {sheetFor === current.id ? (
              <div className="absolute inset-x-0 bottom-0 z-30 max-h-[62%] rounded-t-3xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-black text-emerald-950">
                    Comments · {(current.comments || []).length}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSheetFor(null)}
                    className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
                    aria-label="Hide comments"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="max-h-56 space-y-3 overflow-y-auto px-4 py-3">
                  {(current.comments || []).length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500">
                      No comments yet. Start the conversation.
                    </p>
                  ) : (
                    (current.comments || []).map((entry, index) => (
                      <div key={entry.id || `${entry.clerkId}-${index}`} className="flex gap-2.5">
                        <Avatar name={entry.name} size={30} />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-emerald-950">{entry.name}</p>
                          <p className="break-words text-sm text-slate-600">{entry.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitComment(current);
                  }}
                  className="flex items-center gap-2 border-t border-slate-100 px-3 py-3"
                >
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Add a comment..."
                    maxLength={280}
                    className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || sending}
                    className="rounded-full bg-emerald-700 p-2.5 text-white transition hover:bg-emerald-800 disabled:opacity-40"
                    aria-label="Post comment"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
