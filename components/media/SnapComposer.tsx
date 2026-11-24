"use client";

import { useRef, useState } from "react";
import { Camera, Image as ImageIcon, Loader2, Send, UploadCloud, Video, X, Sparkles } from "lucide-react";
import { uploadImage } from "@/lib/clientUpload";
import { optimizedImage } from "@/lib/image";

const MAX_VIDEO_SECONDS = 12;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

type Props = {
  signedIn: boolean;
  fullName?: string;
  profilePic?: string;
  clerkId?: string;
  onRequireAuth: () => void;
  onPublished: () => void | Promise<void>;
  onMessage?: (message: string) => void;
  className?: string;
};

async function readVideoDuration(file: File) {
  return new Promise<number>((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const value = Number.isFinite(video.duration) ? video.duration : 0;
      URL.revokeObjectURL(video.src);
      resolve(value);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve(0);
    };
    video.src = URL.createObjectURL(file);
  });
}

export default function SnapComposer({
  signedIn,
  fullName,
  profilePic,
  clerkId,
  onRequireAuth,
  onPublished,
  onMessage,
  className = "",
}: Props) {
  const [media, setMedia] = useState<{ url: string; kind: "image" | "video" } | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const browseRef = useRef<HTMLInputElement | null>(null);
  const captureRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    setUploading(true);
    try {
      const isVideo = file.type.startsWith("video/");
      if (isVideo) {
        if (file.size > MAX_VIDEO_BYTES) throw new Error("Keep nature clips below 25 MB.");
        const duration = await readVideoDuration(file);
        if (!duration) throw new Error("That video could not be read. Try a shorter MP4 clip.");
        if (duration > MAX_VIDEO_SECONDS + 0.25) {
          throw new Error(`Nature clips must be ${MAX_VIDEO_SECONDS} seconds or less.`);
        }
      }
      const url = await uploadImage(file);
      setMedia({ url, kind: isVideo ? "video" : "image" });
    } catch (uploadError: any) {
      setError(uploadError?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!signedIn) {
      onRequireAuth();
      return;
    }
    if (!media) {
      setError("Add a photo or a 12-second video first.");
      return;
    }
    if (!caption.trim()) {
      setError("Add a short caption so members know what they are seeing.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/community-snaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId,
          fullName: fullName || "Member",
          userProfilePic: profilePic || "",
          imageUrl: media.kind === "image" ? media.url : "",
          videoUrl: media.kind === "video" ? media.url : "",
          mediaType: media.kind,
          caption,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not publish your snap.");
      setMedia(null);
      setCaption("");
      onMessage?.("Your snap is live. The whole club has been notified 🌿");
      await onPublished();
    } catch (publishError: any) {
      setError(publishError?.message || "Could not publish your snap.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`card overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 border-b border-emerald-50 bg-gradient-to-r from-emerald-50/80 to-lime-50/60 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-black text-emerald-950">Create a nature moment</h2>
          <p className="text-[11px] text-muted">Photo or a 12-second video — straight to the reels.</p>
        </div>
      </div>

      <form onSubmit={publish} className="space-y-4 p-5">
        <div
          className="relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 transition hover:border-emerald-400"
          onClick={() => {
            if (!media) {
              if (!signedIn) return onRequireAuth();
              browseRef.current?.click();
            }
          }}
        >
          {media ? (
            <div className="relative aspect-[4/5] bg-emerald-950">
              {media.kind === "video" ? (
                <video src={media.url} controls playsInline className="h-full w-full object-cover" />
              ) : (
                <img
                  src={optimizedImage(media.url, 900)}
                  alt="Selected snap preview"
                  className="h-full w-full object-cover"
                />
              )}
              <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                {media.kind === "video" ? "Reel · 12s max" : "Photo"}
              </span>
              <button
                type="button"
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation();
                  setMedia(null);
                }}
                className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white transition hover:bg-black"
                aria-label="Remove media"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 px-5 py-9 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
                <ImageIcon className="h-6 w-6" />
              </span>
              <p className="text-sm font-bold text-emerald-900">Drop in your best wildlife shot</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    if (!signedIn) return onRequireAuth();
                    captureRef.current?.click();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-800"
                >
                  <Video className="h-3.5 w-3.5" /> Record 12s reel
                </button>
                <button
                  type="button"
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    if (!signedIn) return onRequireAuth();
                    browseRef.current?.click();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-white px-4 py-2.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-50"
                >
                  <UploadCloud className="h-3.5 w-3.5" /> Browse files
                </button>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700/70">
                JPG · PNG · MP4 · WebM
              </p>
            </div>
          )}

          {uploading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/85 backdrop-blur-sm">
              <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
              <p className="text-xs font-bold text-emerald-800">Optimising your media…</p>
            </div>
          ) : null}
        </div>

        <input
          ref={browseRef}
          type="file"
          accept="image/*,video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={handleFile}
        />
        <input
          ref={captureRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />

        <label className="block">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-emerald-800">
            Caption
          </span>
          <textarea
            rows={3}
            value={caption}
            maxLength={240}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="What did you capture? Species, place, or the story behind the shot."
            className="w-full resize-none rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
          <span className="mt-1 block text-right text-[10px] font-semibold text-muted">
            {caption.length}/240
          </span>
        </label>

        {error ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy || uploading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-900 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {signedIn ? "Post to the reels" : "Continue with Google to post"}
        </button>

        {!signedIn ? (
          <p className="text-center text-[11px] text-muted">
            One tap with Google — no OTP codes, and this device stays signed in.
          </p>
        ) : (
          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted">
            <Camera className="h-3.5 w-3.5" /> Every post notifies the club by email and in-app.
          </p>
        )}
      </form>
    </section>
  );
}
