"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Camera,
  Clock3,
  Image as ImageIcon,
  Loader2,
  Music2,
  Search,
  Send,
  UploadCloud,
  Video,
  X,
  Sparkles,
} from "lucide-react";
import { uploadImage } from "@/lib/clientUpload";
import { optimizedImage } from "@/lib/image";
import type { JamendoTrack } from "@/lib/jamendo";
import { isVideoFile, MAX_SNAP_VIDEO_SECONDS, readVideoDuration } from "@/lib/video";

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const CAMERA_FILTERS = {
  normal: "none",
  warm: "sepia(0.25) saturate(1.2)",
  mono: "grayscale(1) contrast(1.1)",
  vivid: "saturate(1.45) contrast(1.05)",
  cool: "hue-rotate(15deg) saturate(1.1)",
} as const;

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
  const [postKind, setPostKind] = useState<"reel" | "story">("reel");
  const [events, setEvents] = useState<{ _id: string; title: string }[]>([]);
  const [eventId, setEventId] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingMuted, setRecordingMuted] = useState(false);
  const [cameraFilter, setCameraFilter] = useState<keyof typeof CAMERA_FILTERS>("normal");
  const [musicQuery, setMusicQuery] = useState("");
  const [musicResults, setMusicResults] = useState<JamendoTrack[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<JamendoTrack | null>(null);
  const [isSearchingMusic, setIsSearchingMusic] = useState(false);
  const [musicError, setMusicError] = useState("");
  const cameraPreviewRef = useRef<HTMLVideoElement | null>(null);
  const cameraCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const cameraFrameRef = useRef<number | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingTickRef = useRef<number | null>(null);
  const discardRecordingRef = useRef(false);

  useEffect(() => {
    let active = true;
    fetch("/api/public/events", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setEvents(
          (data.events || []).map((event: { _id: string; title: string }) => ({
            _id: event._id,
            title: event.title,
          }))
        );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const browseRef = useRef<HTMLInputElement | null>(null);
  const photoCaptureRef = useRef<HTMLInputElement | null>(null);

  const searchMusic = async () => {
    if (!signedIn) {
      onRequireAuth();
      return;
    }
    const query = musicQuery.trim();
    if (query.length < 2) {
      setMusicError("Enter at least two characters to search.");
      return;
    }

    setMusicError("");
    setMusicResults([]);
    setIsSearchingMusic(true);
    try {
      const response = await fetch(`/api/music/search?q=${encodeURIComponent(query)}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Music search failed.");
      const tracks = Array.isArray(data.tracks) ? data.tracks : [];
      setMusicResults(tracks);
      if (tracks.length === 0) setMusicError("No matching CC BY tracks found.");
    } catch (searchError) {
      setMusicError(searchError instanceof Error ? searchError.message : "Music search failed.");
      setMusicResults([]);
    } finally {
      setIsSearchingMusic(false);
    }
  };

  const uploadMedia = async (file: File) => {
    setError("");
    setUploading(true);
    try {
      const isVideo = isVideoFile(file);
      if (!isVideo) setSelectedMusic(null);
      if (isVideo) {
        if (file.size > MAX_VIDEO_BYTES) throw new Error("Keep nature clips below 100 MB.");
        const duration = await readVideoDuration(file);
        if (duration > MAX_SNAP_VIDEO_SECONDS + 0.25) {
          throw new Error(`Nature clips must be ${MAX_SNAP_VIDEO_SECONDS} seconds or less.`);
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

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void uploadMedia(file);
  };

  const stopCameraStream = (stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => track.stop());
  };

  const openCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Camera recording is not supported in this browser. Use Browse files instead.");
      return;
    }

    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: true,
      });
      setCameraStream(stream);
      setCameraOpen(true);
      setRecordingMuted(false);
      stream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
    } catch (cameraError) {
      console.error("Could not open the camera:", cameraError);
      setError("Camera or microphone permission was denied. Allow access or use Browse files.");
    }
  };

  useEffect(() => {
    const preview = cameraPreviewRef.current;
    const canvas = cameraCanvasRef.current;
    if (!preview || !canvas || !cameraStream) return;
    preview.srcObject = cameraStream;
    preview.play().catch((playError) => {
      console.error("Camera preview could not start:", playError);
      setError("Camera preview could not start. Please close it and try again.");
    });
    const context = canvas.getContext("2d");
    if (!context) {
      setError("Video effects are not supported in this browser. Use Browse files instead.");
      return;
    }

    const drawFrame = () => {
      if (preview.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && preview.videoWidth > 0) {
        const scale = Math.min(1, 1280 / Math.max(preview.videoWidth, preview.videoHeight));
        const width = Math.max(2, Math.floor((preview.videoWidth * scale) / 2) * 2);
        const height = Math.max(2, Math.floor((preview.videoHeight * scale) / 2) * 2);
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        context.filter = CAMERA_FILTERS[cameraFilter];
        context.drawImage(preview, 0, 0, canvas.width, canvas.height);
      }
      cameraFrameRef.current = window.requestAnimationFrame(drawFrame);
    };
    cameraFrameRef.current = window.requestAnimationFrame(drawFrame);

    return () => {
      if (cameraFrameRef.current !== null) window.cancelAnimationFrame(cameraFrameRef.current);
      cameraFrameRef.current = null;
    };
  }, [cameraStream, cameraOpen, cameraFilter]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current !== null) window.clearTimeout(recordingTimerRef.current);
      if (recordingTickRef.current !== null) window.clearInterval(recordingTickRef.current);
      if (cameraFrameRef.current !== null) window.cancelAnimationFrame(cameraFrameRef.current);
      stopCameraStream(cameraStream);
      stopCameraStream(recordingStreamRef.current);
    };
  }, [cameraStream]);

  const closeCamera = () => {
    discardRecordingRef.current = true;
    if (recordingTimerRef.current !== null) window.clearTimeout(recordingTimerRef.current);
    if (recordingTickRef.current !== null) window.clearInterval(recordingTickRef.current);
    recordingTimerRef.current = null;
    recordingTickRef.current = null;
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    } else {
      stopCameraStream(cameraStream);
      setCameraStream(null);
      setCameraOpen(false);
      setRecording(false);
    }
  };

  const startRecording = () => {
    if (!cameraStream || recording) return;
    try {
      const canvasStream = cameraCanvasRef.current?.captureStream(30);
      if (!canvasStream?.getVideoTracks().length) {
        throw new Error("The camera preview is not ready yet.");
      }
      const audioTracks = cameraStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !recordingMuted;
      });
      const recordingStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioTracks,
      ]);
      recordingStreamRef.current = recordingStream;
      const supportedTypes = [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
        "video/mp4",
      ];
      const mimeType = supportedTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(recordingStream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 2_500_000,
        audioBitsPerSecond: 128_000,
      });
      recordingChunksRef.current = [];
      discardRecordingRef.current = false;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onerror = (recorderError) => {
        console.error("Camera recording failed:", recorderError);
        setError("Recording failed. Please try again or choose a saved clip.");
      };
      recorder.onstop = () => {
        if (recordingTimerRef.current !== null) window.clearTimeout(recordingTimerRef.current);
        if (recordingTickRef.current !== null) window.clearInterval(recordingTickRef.current);
        recordingTimerRef.current = null;
        recordingTickRef.current = null;
        const stream = cameraStream;
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || "video/webm" });
        const shouldDiscard = discardRecordingRef.current;
        recorderRef.current = null;
        stopCameraStream(recordingStreamRef.current);
        recordingStreamRef.current = null;
        stopCameraStream(stream);
        setCameraStream(null);
        setCameraOpen(false);
        setRecording(false);
        setRecordingSeconds(0);
        if (shouldDiscard) return;
        if (!blob.size) {
          setError("The recording was empty. Please try again.");
          return;
        }
        const isMp4 = blob.type.includes("mp4");
        const file = new File([blob], `nature-snap.${isMp4 ? "mp4" : "webm"}`, { type: blob.type });
        void uploadMedia(file);
      };
      recorderRef.current = recorder;
      recorder.start(250);
      setRecording(true);
      setRecordingSeconds(0);
      recordingTickRef.current = window.setInterval(() => {
        setRecordingSeconds((seconds) => Math.min(MAX_SNAP_VIDEO_SECONDS, seconds + 1));
      }, 1000);
      recordingTimerRef.current = window.setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
      }, MAX_SNAP_VIDEO_SECONDS * 1000);
    } catch (recordingError) {
      stopCameraStream(recordingStreamRef.current);
      recordingStreamRef.current = null;
      console.error("Could not start camera recording:", recordingError);
      setError("Recording could not start on this device. Try another browser or use Browse files.");
    }
  };

  const toggleRecordingMute = () => {
    setRecordingMuted((muted) => {
      const nextMuted = !muted;
      cameraStream?.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
      return nextMuted;
    });
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
          musicTrackId: media.kind === "video" ? selectedMusic?.id || "" : "",
          mediaType: media.kind,
          caption,
          kind: postKind,
          eventId: eventId || "",
          eventTitle: events.find((event) => event._id === eventId)?.title || "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not publish your snap.");
      setMedia(null);
      setSelectedMusic(null);
      setMusicResults([]);
      setCaption("");
      setEventId("");
      onMessage?.(
        postKind === "story"
          ? "Story posted — it disappears automatically in 7 days ⏳"
          : "Your snap is live. The whole club has been notified 🌿"
      );
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
          <p className="text-[11px] text-muted">
            Post a snap that stays, or a story that vanishes in 7 days.
          </p>
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
                  className="h-full w-full object-contain"
                />
              )}
              <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                {media.kind === "video" ? "Snap video · 12s max" : "Photo"}
              </span>
              <button
                type="button"
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation();
                  setMedia(null);
                  setSelectedMusic(null);
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
                    photoCaptureRef.current?.click();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-white px-4 py-2.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-50"
                >
                  <Camera className="h-3.5 w-3.5" /> Take a photo
                </button>
                <button
                  type="button"
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    if (!signedIn) return onRequireAuth();
                    void openCamera();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-800"
                >
                  <Video className="h-3.5 w-3.5" /> Record up to 12s
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
          ref={photoCaptureRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />
        {media?.kind === "video" ? (
          <div className="space-y-3 rounded-2xl border border-emerald-100 bg-white p-4">
            <div className="flex items-center gap-2">
              <Music2 className="h-4 w-4 text-emerald-700" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Add licensed music</span>
            </div>
            {selectedMusic ? (
              <div className="space-y-2 rounded-xl bg-emerald-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-xs font-bold text-emerald-950">
                    {selectedMusic.title} · {selectedMusic.artist}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedMusic(null)}
                    className="shrink-0 text-[11px] font-bold text-rose-700 underline"
                  >
                    Remove
                  </button>
                </div>
                <audio src={selectedMusic.audioUrl} controls preload="none" className="h-9 w-full" />
                <p className="text-[10px] text-emerald-800">
                  CC BY · You&apos;ll credit the artist and link the license on your snap.
                </p>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    type="search"
                    value={musicQuery}
                    onChange={(event) => setMusicQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void searchMusic();
                      }
                    }}
                    maxLength={80}
                    placeholder="Search songs or artists"
                    className="min-w-0 flex-1 rounded-xl border border-emerald-100 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => void searchMusic()}
                    disabled={isSearchingMusic}
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {isSearchingMusic ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Search
                  </button>
                </div>
                {musicError ? <p className="text-xs font-semibold text-rose-700">{musicError}</p> : null}
                {musicResults.length > 0 ? (
                  <div className="max-h-52 space-y-1 overflow-y-auto">
                    {musicResults.map((track) => (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => {
                          setSelectedMusic(track);
                          setMusicResults([]);
                          setMusicError("");
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-emerald-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-bold text-slate-800">{track.title}</span>
                          <span className="block truncate text-[10px] text-slate-500">{track.artist}</span>
                        </span>
                        <span className="shrink-0 text-[10px] font-bold text-emerald-700">CC BY · Preview</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {!musicError && musicResults.length === 0 ? (
                  <p className="text-[10px] text-muted">Search results include tracks available under CC BY.</p>
                ) : null}
              </>
            )}
          </div>
        ) : null}
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-800">Post as</p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "reel", label: "Snap", hint: "Stays on the wall", icon: Video },
                { value: "story", label: "Story", hint: "Disappears in 7 days", icon: Clock3 },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPostKind(option.value)}
                aria-pressed={postKind === option.value}
                className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition ${
                  postKind === option.value
                    ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                    : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
                }`}
              >
                <option.icon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <span className="block text-xs font-black">{option.label}</span>
                  <span className="block text-[10px] font-medium opacity-70">{option.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {events.length > 0 ? (
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Tag an event (optional)
            </span>
            <select
              value={eventId}
              onChange={(changeEvent) => setEventId(changeEvent.target.value)}
              className="w-full rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="">Not linked to an event</option>
              {events.map((event) => (
                <option key={event._id} value={event._id}>
                  {event.title}
                </option>
              ))}
            </select>
            <span className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-muted">
              <CalendarDays className="h-3 w-3" /> Tagged posts appear in that event&apos;s snaps.
            </span>
          </label>
        ) : null}

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
          {signedIn
            ? postKind === "story"
              ? "Post story · disappears in 7 days"
              : "Post snap"
            : "Continue with Google to post"}
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

      {cameraOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-3 sm:p-6">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-black shadow-2xl">
            <canvas ref={cameraCanvasRef} className="hidden" />
            <video
              ref={cameraPreviewRef}
              autoPlay
              muted
              playsInline
              style={{ filter: CAMERA_FILTERS[cameraFilter] }}
              className="aspect-[9/16] max-h-[72dvh] w-full bg-black object-cover"
            />
            <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/75 to-transparent p-4 text-white">
              <span className="text-sm font-bold">
                {recording ? `Recording · ${recordingSeconds}/${MAX_SNAP_VIDEO_SECONDS}s` : "Camera ready"}
              </span>
              <button
                type="button"
                onClick={closeCamera}
                aria-label="Close camera"
                className="rounded-full bg-white/15 p-2 hover:bg-white/25"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 bg-gradient-to-t from-black/90 to-transparent p-4 pt-12">
              <div className="flex items-center gap-2">
                {(Object.keys(CAMERA_FILTERS) as (keyof typeof CAMERA_FILTERS)[]).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setCameraFilter(filter)}
                    aria-pressed={cameraFilter === filter}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${
                      cameraFilter === filter ? "bg-lime-300 text-emerald-950" : "bg-white/15 text-white"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={toggleRecordingMute}
                aria-label={recordingMuted ? "Include microphone audio" : "Mute microphone"}
                className="rounded-full bg-white/15 px-3 py-2 text-xs font-bold text-white"
              >
                {recordingMuted ? "Mic off" : "Mic on"}
              </button>
              <button
                type="button"
                onClick={recording ? () => recorderRef.current?.stop() : startRecording}
                className={`rounded-full px-5 py-3 text-sm font-black text-white ${
                  recording ? "bg-rose-600" : "bg-emerald-600"
                }`}
              >
                {recording ? "Stop & use" : "Start 12s recording"}
              </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
