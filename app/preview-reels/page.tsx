"use client";

import ReelsFeed, { type ReelItem } from "@/components/media/ReelsFeed";

const items: ReelItem[] = [
  {
    id: "clip",
    src: "https://res.cloudinary.com/demo/video/upload/dog.mp4",
    kind: "video",
    authorName: "Mercy Njoki",
    badge: "Story · 7 days",
    subtitle: "Story · 7 days",
    caption: "Testing the reel player: sound, pause and next controls.",
    isStory: true,
    likes: ["a", "b"],
    comments: [{ id: "c1", name: "Kelvin", text: "Nice capture!" }],
    reposts: [],
    href: "/nature-snaps",
  },
  {
    id: "photo",
    src: "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1200&auto=format&fit=crop",
    kind: "image",
    authorName: "Elijah Mutua",
    badge: "Member snap",
    subtitle: "Member snap",
    caption: "Second item — verifies next/previous navigation.",
    likes: ["a"],
    comments: [],
    reposts: [],
    href: "/nature-snaps",
  },
];

export default function PreviewReelsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-black text-emerald-950">Reel player test</h1>
      <ReelsFeed items={items} currentUserId="a" storiesTitle="Stories" onComment={() => {}} />
    </div>
  );
}
