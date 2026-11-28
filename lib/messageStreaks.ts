export type ConversationStreakSnapshot = {
  activeWeek?: string | null;
  lastMutualWeek?: string | null;
  streakWeeks?: number;
  participantKey?: string;
};

type ConversationStreakState = ConversationStreakSnapshot & {
  activeWeekParticipants: string[];
};

export function getIsoWeekKey(date: Date) {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((day.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${day.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

export function completedStreakWeeks(conversation: ConversationStreakSnapshot, now: Date) {
  const currentWeek = getIsoWeekKey(now);
  if (conversation.activeWeek === currentWeek) return conversation.streakWeeks || 0;

  const previousWeekDate = new Date(now);
  previousWeekDate.setUTCDate(previousWeekDate.getUTCDate() - 7);
  const previousWeek = getIsoWeekKey(previousWeekDate);
  return conversation.lastMutualWeek === previousWeek
    ? (conversation.streakWeeks || 0) + 1
    : 0;
}

export function rollConversationStreak(conversation: ConversationStreakState, now: Date) {
  const currentWeek = getIsoWeekKey(now);
  if (conversation.activeWeek === currentWeek) return;

  conversation.streakWeeks = completedStreakWeeks(conversation, now);
  conversation.activeWeek = currentWeek;
  conversation.activeWeekParticipants = [];
}
