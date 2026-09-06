import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import connectMongoDB from '@/lib/mongodb';
import Member from '@/models/Member';

export async function POST(req: Request) {
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occurred -- no svix headers', { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || '';
  if (!webhookSecret) {
    return new Response('Error occurred -- missing webhook secret', { status: 500 });
  }

  const wh = new Webhook(webhookSecret);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as unknown as WebhookEvent;
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return new Response('Error occurred -- invalid signature', { status: 400 });
  }

  const eventType = evt.type;

  // Handle Account Creation and Updates
  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name } = evt.data as any;
    const email = email_addresses[0]?.email_address;

    // 1. Sync User to MongoDB using the unique Clerk ID
    try {
      await connectMongoDB();
      await Member.findOneAndUpdate(
        { clerkId: id }, // Strictly matches the exact user ID
        {
          clerkId: id,
          email: email,
          name: first_name || 'Member',
        },
        { upsert: true, new: true } // Creates new if missing, updates if exists
      );
    } catch (dbErr) {
      console.error("Database sync failed:", dbErr);
    }

    // 2. Dispatch Welcome Email (Only on Creation)
    if (eventType === 'user.created' && email) {
      try {
        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': process.env.BREVO_API_KEY || '',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: "DEKUWEC", email: "wildlifeandenvironmentalclub@students.dekut.ac.ke" },
            to: [{ email: email, name: first_name || 'Member' }],
            subject: "Welcome to DEKUWEC - Dedan Kimathi University!",
            htmlContent: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #064e3b;">
                <h2 style="color: #059669;">Jambo ${first_name || 'Conservationist'}!</h2>
                <p>Congratulations on joining the most vibrant club at DeKUT — <strong>Dedan Kimathi Wildlife and Environmental Club (DEKUWEC)</strong>!</p>
                <div style="background-color: #ecfdf5; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #a7f3d0;">
                  <h3 style="margin-top: 0; color: #065f46;">Our Core Activities Include:</h3>
                  <ul style="padding-left: 20px; margin-bottom: 0;">
                    <li>Tree Nursery Establishment & Conservation Drives</li>
                    <li>Nature Exploration Hikes & Waterfalls Excursions (Aberdares)</li>
                    <li>Weekly Meetings, Board Games & Environmental Debates</li>
                  </ul>
                </div>
                <p>Log in to your dashboard to view upcoming excursions, community projects, and member perks.</p>
                <br/>
                <p>Best regards,<br/><strong>DEKUWEC Executive Board</strong></p>
              </div>
            `
          })
        });
      } catch (emailErr) {
        console.error("Failed to dispatch welcome email via Brevo:", emailErr);
      }
    }
  }

  // Handle Account Deletion
  if (eventType === 'user.deleted') {
    const { id } = evt.data as any;
    try {
      await connectMongoDB();
      await Member.findOneAndDelete({ clerkId: id });
    } catch (dbErr) {
      console.error("Failed to delete user from MongoDB:", dbErr);
    }
  }

  return NextResponse.json({ message: 'Webhook received successfully' }, { status: 200 });
}
