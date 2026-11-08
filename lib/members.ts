import { connectToDatabase } from "@/lib/mongodb";
import Member from "@/models/Member";
import WckApplication from "@/models/WckApplication";
import MerchandiseOrder from "@/models/MerchandiseOrder";

export const guestClerkId = (email: string) => `email:${email.trim().toLowerCase()}`;

export const isGuestClerkId = (clerkId?: string | null) =>
  typeof clerkId === "string" && clerkId.startsWith("email:");

type EnsureMemberInput = {
  clerkId?: string;
  email?: string;
  fullName?: string;
};

/**
 * Makes sure an email address exists in the member directory.
 * Guests (no Clerk account yet) are stored under an `email:` placeholder id and
 * re-keyed to the real Clerk id the first time they sign in with Google.
 */
export async function ensureMember({ clerkId, email, fullName }: EnsureMemberInput) {
  if (!email) return null;

  await connectToDatabase();
  const normalizedEmail = email.trim().toLowerCase();
  const placeholderId = guestClerkId(normalizedEmail);
  const targetId = clerkId || placeholderId;

  let member = await Member.findOne({ clerkId: targetId });

  if (!member) {
    // An earlier guest record created from a direct link belongs to this account now.
    member = await Member.findOne({ clerkId: placeholderId });
    if (member) {
      member.clerkId = targetId;
      if (fullName) member.fullName = fullName;
      member.email = normalizedEmail;
      await member.save();
      return member;
    }

    const byEmail = !clerkId ? await Member.findOne({ email: normalizedEmail }) : null;
    if (byEmail && byEmail.clerkId !== targetId) {
      byEmail.clerkId = targetId;
      if (fullName) byEmail.fullName = fullName;
      await byEmail.save();
      return byEmail;
    }

    member = await Member.create({
      clerkId: targetId,
      email: normalizedEmail,
      fullName: fullName || normalizedEmail.split("@")[0],
      status: clerkId ? "Pending Approval" : "Subscribed",
    });
    return member;
  }

  const updates: Record<string, unknown> = { email: normalizedEmail };
  if (fullName && fullName !== member.fullName) updates.fullName = fullName;
  if (Object.keys(updates).length > 1) {
    await Member.updateOne({ _id: member._id }, { $set: updates });
  }
  return member;
}

/**
 * Attaches applications/orders submitted from a direct link (while signed out)
 * to the Clerk account that owns the same email address.
 */
export async function linkGuestRecords(clerkId: string, email?: string | null) {
  if (!clerkId || !email) return;
  const placeholderId = guestClerkId(email);
  if (placeholderId === clerkId) return;

  await connectToDatabase();
  const placeholderMember = await Member.findOne({ clerkId: placeholderId });
  const accountMember = await Member.findOne({ clerkId });

  await Promise.all([
    WckApplication.updateMany({ clerkId: placeholderId }, { $set: { clerkId } }),
    MerchandiseOrder.updateMany({ clerkId: placeholderId }, { $set: { clerkId } }),
    placeholderMember
      ? accountMember
        ? Member.deleteOne({ _id: placeholderMember._id })
        : Member.updateOne({ _id: placeholderMember._id }, { $set: { clerkId } })
      : Promise.resolve(),
  ]).catch((err) => console.error("Guest record linking failed:", err));
}
