import type { ReelItem } from "@/components/media/ReelsFeed";

export type SnapSource = {
  _id: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: "image" | "video";
  caption?: string;
  description?: string;
  title?: string;
  photographer?: string;
  fullName?: string;
  userProfilePic?: string;
  clerkId?: string;
  type?: "winner" | "honourable" | "top_submission";
  kind?: "reel" | "story";
  expiresAt?: string;
  eventId?: string;
  eventTitle?: string;
  likes?: string[];
  reposts?: string[];
  comments?: { clerkId: string; fullName: string; text: string; createdAt?: string }[];
  createdAt?: string;
};

export type EventSource = {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  date?: string;
  location?: string;
  likes?: string[];
  reposts?: string[];
  comments?: { clerkId: string; fullName: string; text: string; createdAt?: string }[];
  media?: { url?: string; type?: string; kind?: string }[];
};

const snapBadge = (type?: string) => {
  if (type === "winner") return "Weekly winner";
  if (type === "honourable") return "Honourable mention";
  return "Official feature";
};

export function snapToReel(snap: SnapSource, official = false): ReelItem | null {
  const isVideo = snap.mediaType === "video" || !!snap.videoUrl;
  const src = (isVideo ? snap.videoUrl : snap.imageUrl) || snap.imageUrl;
  if (!src) return null;

  return {
    id: snap._id,
    src,
    kind: isVideo ? "video" : "image",
    authorName: snap.fullName || snap.photographer || "DEKUWEC member",
    authorAvatar: snap.userProfilePic,
    authorId: snap.clerkId,
    subtitle: official ? snapBadge(snap.type) : snap.kind === "story" ? "Story · 7 days" : "Member snap",
    badge: official ? snapBadge(snap.type) : snap.kind === "story" ? "Story · 7 days" : "Member snap",
    caption: snap.caption || snap.description || snap.title,
    isStory: snap.kind === "story",
    expiresAt: snap.expiresAt,
    eventTitle: snap.eventTitle && !official ? String(snap.eventTitle) : undefined,
    createdAt: snap.createdAt,
    likes: snap.likes || [],
    reposts: snap.reposts || [],
    comments: (snap.comments || []).map((entry, index) => ({
      id: `${snap._id}-${index}`,
      clerkId: entry.clerkId,
      name: entry.fullName,
      text: entry.text,
      createdAt: entry.createdAt,
    })),
    href: `/nature-snaps?snap=${snap._id}`,
  };
}

export function eventToReels(event: EventSource): ReelItem[] {
  const media = Array.isArray(event.media) ? event.media : [];
  const entries = [
    ...(event.imageUrl ? [{ url: event.imageUrl, type: "image" }] : []),
    ...media.filter((entry) => entry?.url),
  ].slice(0, 6);

  return entries.map((entry, index) => {
    const type = String(entry.type || entry.kind || "image").toLowerCase();
    return {
      id: `${event._id}-${index}`,
      src: String(entry.url),
      kind: type.includes("video") ? "video" : "image",
      authorName: "DEKUWEC Events",
      subtitle: [event.date, event.location].filter(Boolean).join(" · ") || "Club event",
      badge: "Club event",
      caption: event.title,
      likes: index === 0 ? event.likes || [] : [],
      comments:
        index === 0
          ? (event.comments || []).map((entry, commentIndex) => ({
              id: `${event._id}-${commentIndex}`,
              clerkId: entry.clerkId,
              name: entry.fullName,
              text: entry.text,
              createdAt: entry.createdAt,
            }))
          : [],
      reposts: index === 0 ? event.reposts || [] : [],
      href: `/events?event=${event._id}`,
    };
  });
}
