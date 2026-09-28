"use client";

import { useEffect, useState } from "react";
import { Download, Eye, Loader2, X } from "lucide-react";

export default function MessageAttachment({ message, isMine }: { message: any; isMine: boolean }) {
  const [onceUrl, setOnceUrl] = useState<string | null>(null);
  const [hasViewed, setHasViewed] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => {
    if (onceUrl) URL.revokeObjectURL(onceUrl);
  }, [onceUrl]);

  if (!message.mediaType) return null;

  if (message.viewOnce && isMine && !message.mediaUrl) {
    return <p className="mt-2 text-xs italic opacity-75">View-once {message.mediaType} sent</p>;
  }

  const openOnce = async () => {
    setIsOpening(true);
    setError("");
    try {
      const response = await fetch(`/api/messages/media?messageId=${message._id}`, { cache: "no-store" });
      if (!response.ok) throw new Error("This view-once media has already been opened or is unavailable.");
      setOnceUrl(URL.createObjectURL(await response.blob()));
      setHasViewed(true);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "Unable to open media.");
    } finally {
      setIsOpening(false);
    }
  };

  const closeOnce = () => {
    if (onceUrl) URL.revokeObjectURL(onceUrl);
    setOnceUrl(null);
  };

  if (message.viewOnce && !isMine && !onceUrl) {
    return (
      <div className="mt-2">
        {message.viewedAt || hasViewed ? (
          <p className="text-xs italic opacity-75">View-once media opened</p>
        ) : (
          <button type="button" onClick={openOnce} disabled={isOpening} className="inline-flex items-center gap-2 rounded-lg bg-black/10 px-3 py-2 text-xs font-bold transition hover:bg-black/15 disabled:opacity-60">
            {isOpening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            Open view-once {message.mediaType}
          </button>
        )}
        {error && <p className="mt-1 text-xs text-rose-700">{error}</p>}
      </div>
    );
  }

  const mediaUrl = onceUrl || message.mediaUrl;
  if (!mediaUrl) return null;
  const previewUrl = onceUrl ? onceUrl : message.mediaType === "video"
    ? mediaUrl.replace("/video/upload/", "/video/upload/q_auto,w_960,vc_auto/")
    : mediaUrl.replace("/image/upload/", "/image/upload/f_auto,q_auto,w_960/");

  return (
    <div className="mt-2 space-y-1">
      {message.mediaType === "video" ? (
        <video src={previewUrl} controls playsInline preload="metadata" className="max-h-64 max-w-full rounded-lg bg-black" />
      ) : (
        <a href={mediaUrl} target="_blank" rel="noreferrer" aria-label="Open attached photo">
          <img src={previewUrl} alt="Message attachment" loading="lazy" decoding="async" className="max-h-64 max-w-full rounded-lg object-contain" />
        </a>
      )}
      {!message.viewOnce && (
        <a href={`/api/messages/media?messageId=${message._id}&download=1`} className={`inline-flex items-center gap-1 text-[11px] font-bold underline underline-offset-2 ${isMine ? "text-white/90" : "text-emerald-700"}`}>
          <Download className="h-3 w-3" /> Download {message.mediaType}
        </a>
      )}
      {onceUrl && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true" aria-label="View-once media">
          <button type="button" onClick={closeOnce} aria-label="Close media" className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/25">
            <X className="h-5 w-5" />
          </button>
          {message.mediaType === "video" ? (
            <video src={onceUrl} controls autoPlay playsInline className="max-h-full max-w-full" />
          ) : (
            <img src={onceUrl} alt="View-once message attachment" className="max-h-full max-w-full object-contain" />
          )}
        </div>
      )}
    </div>
  );
}
