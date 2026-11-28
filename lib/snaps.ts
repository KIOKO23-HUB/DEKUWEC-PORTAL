/** Stories live for one week; snaps stay on the wall. */
export const STORY_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

/** Mongo filter that hides expired stories without deleting the record. */
export const activeSnapFilter = () => {
  const now = new Date();
  return {
    $or: [
      { kind: { $ne: "story" }, expiresAt: null },
      { expiresAt: { $gt: now } },
      { kind: "story", createdAt: { $gt: new Date(now.getTime() - STORY_LIFETIME_MS) } },
    ],
  };
};

export const storyExpiry = (kind?: string) =>
  kind === "story" ? new Date(Date.now() + STORY_LIFETIME_MS) : null;
