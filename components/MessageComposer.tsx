"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Send, Smile, X } from "lucide-react";

type MessageComposerProps = {
  receiverId: string;
  disabled?: boolean;
  placeholder?: string;
  onMessageSent: (data: any) => void;
};

export default function MessageComposer({ receiverId, disabled = false, placeholder = "Type a message...", onMessageSent }: MessageComposerProps) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [viewOnce, setViewOnce] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"emoji" | "sticker">("emoji");
  const inputRef = useRef<HTMLInputElement>(null);

  const send = async (messageText = text, sticker = false) => {
    if (disabled || isSending || (!messageText.trim() && !file)) return;
    setIsSending(true);
    try {
      let media: { url: string; type: string } | null = null;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadResponse = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadData.results?.[0]) throw new Error(uploadData.error || "Media upload failed.");
        media = {
          url: uploadData.results[0].url,
          type: uploadData.results[0].resource_type === "video" ? "video" : "image",
        };
      }

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId,
          content: messageText.trim(),
          mediaUrl: media?.url || "",
          mediaType: media?.type || "",
          viewOnce: Boolean(media && viewOnce),
          sticker,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Message could not be sent.");
      onMessageSent(result);
      setText("");
      setFile(null);
      setViewOnce(false);
      setPickerOpen(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Message could not be sent.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void send();
  };

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;
    if (!selected.type.startsWith("image/") && !selected.type.startsWith("video/")) return alert("Choose a photo or video.");
    if (selected.size > 25 * 1024 * 1024) return alert("Media must be 25 MB or smaller.");
    setFile(selected);
  };

  const emojiChoices = ["😀", "😂", "🥰", "👍", "🙏", "🌿", "🌍", "🦋", "🐘", "🔥"];
  const stickerChoices = ["🌱", "🐘", "🦋", "🌍", "🌳", "💚"];

  return (
    <div className="shrink-0 border-t border-gray-100 bg-white">
      {file && (
        <div className="flex items-center justify-between gap-2 bg-emerald-50 px-3 py-2 text-xs">
          <span className="min-w-0 truncate font-semibold text-emerald-900">{file.name}</span>
          <div className="flex shrink-0 items-center gap-2">
            <label className="flex items-center gap-1 font-medium text-gray-700">
              <input type="checkbox" checked={viewOnce} onChange={(event) => setViewOnce(event.target.checked)} /> View once
            </label>
            <button type="button" onClick={() => setFile(null)} aria-label="Remove attachment" className="p-1 text-gray-500 hover:text-rose-600"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}
      {pickerOpen && (
        <div className="border-b border-gray-100 p-3">
          <div className="mb-2 flex gap-2 text-xs font-bold">
            <button type="button" onClick={() => setPickerMode("emoji")} className={`rounded px-2 py-1 ${pickerMode === "emoji" ? "bg-emerald-100 text-emerald-900" : "text-gray-500"}`}>Emoji</button>
            <button type="button" onClick={() => setPickerMode("sticker")} className={`rounded px-2 py-1 ${pickerMode === "sticker" ? "bg-emerald-100 text-emerald-900" : "text-gray-500"}`}>Stickers</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(pickerMode === "emoji" ? emojiChoices : stickerChoices).map((emoji) => (
              <button key={emoji} type="button" aria-label={pickerMode === "sticker" ? `Send ${emoji} sticker` : `Insert ${emoji}`} onClick={() => pickerMode === "sticker" ? void send(emoji, true) : setText((current) => `${current}${emoji}`)} className={`${pickerMode === "sticker" ? "text-3xl" : "text-xl"} rounded-lg p-1 hover:bg-emerald-50`}>
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-center gap-1.5 p-3">
        <input ref={inputRef} type="file" accept="image/*,video/*" onChange={handleFile} className="hidden" />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled || isSending} aria-label="Attach photo or video" title="Attach photo or video" className="rounded-full p-2 text-gray-500 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50">
          <ImagePlus className="h-5 w-5" />
        </button>
        <button type="button" onClick={() => setPickerOpen((open) => !open)} disabled={disabled} aria-label="Emoji and stickers" title="Emoji and stickers" className="rounded-full p-2 text-gray-500 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50">
          <Smile className="h-5 w-5" />
        </button>
        <input type="text" placeholder={placeholder} value={text} onChange={(event) => setText(event.target.value)} disabled={disabled || isSending} className="min-w-0 flex-1 rounded-full bg-gray-100 px-4 py-2 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500" />
        <button type="submit" disabled={disabled || isSending || (!text.trim() && !file)} aria-label="Send message" className="shrink-0 rounded-full bg-emerald-600 p-2.5 text-white transition hover:bg-emerald-700 disabled:opacity-50">
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
