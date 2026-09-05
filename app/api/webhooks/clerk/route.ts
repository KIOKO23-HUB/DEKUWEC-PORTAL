import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  // If using a webhook secret from Clerk dashboard:
  // const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '');

  const eventType = payload.type;
  if (eventType === 'user.created') {
    const { email_addresses, first_name } = payload.data;
    const email = email_addresses[0]?.email_address;

    // Trigger Brevø API email dispatch here
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY || '',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: "DEKUWEC", email: "wildlifeandenvironmentalclub@dkut.ac.ke" },
        to: [{ email: email, name: first_name || 'Member' }],
        subject: "Welcome to DEKUWEC - Dedan Kimathi University!",
        htmlContent: `
          <h1>Jambo ${first_name || 'Conservationist'}!</h1>
          <p>Congratulations on joining the most brilliant club at DeKUT — Dedan Kimathi Wildlife and Environmental Club!</p>
          <h3>Our Core Activities Include:</h3>
          <ul>
            <li>Tree Nursery Establishment & Conservation Drives</li>
            <li>Nature Exploration Hikes & Waterfalls Excursions (Aberdares)</li>
            <li>Weekly Meetings & Environmental Debates</li>
          </ul>
          <p>Log in to your dashboard to view upcoming events and weekly meeting hours.</p>
        `
      })
    });
  }

  return new Response('Webhook received', { status: 200 });
}
