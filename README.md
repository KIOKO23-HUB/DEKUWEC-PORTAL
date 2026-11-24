This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Member portal

Everything under `/dashboard` shares one shell (`app/dashboard/layout.tsx`): a grouped
sidebar with active-state tracking, a glass top bar, a user card, and a mobile bottom nav.
Pages open with the shared `components/portal/PortalPageHeader.tsx` banner so section
headings, colours and spacing stay consistent.

`/dashboard/events` combines a reels/stories gallery with RSVP cards and a three-step
M-Pesa flow (details → payment → confirmation) that polls every 1.5 seconds.

## Media experience

Nature Snaps and club events use a shared reels/stories engine
(`components/media/ReelsFeed.tsx`):

- Vertical 9:16 reels with autoplay, progress bars, tap-to-pause and arrow-key navigation.
- Like, comment (with inline thread), repost and native share on every item.
- Story rail with gradient rings; the viewer pauses autoplay while comments are open.
- Photo uploads and short videos capped at **12 seconds** (`components/media/SnapComposer.tsx`).

The member dashboard (`app/dashboard/page.tsx`) mirrors a social feed: stories, cards,
an AI eco spotlight and the next-event reminder.

## AI eco briefings

`GET /api/ai/eco-spotlight` composes a daily wildlife spotlight, a rotating conservation
tip and the next upcoming event reminder from a curated knowledge base plus live club data.
It is deterministic per day/hour, cached for 5 minutes, and needs no external model key.
The pop-up (`components/EcoSpotlight.tsx`) shows once per browser session.

## Payments

Event registration sends an M-Pesa STK push and polls `/api/mpesa/status` every 1.5s,
showing a prompt → PIN → confirmation timeline. Safaricom access tokens are cached per
worker to avoid an extra OAuth round trip on every prompt.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel
##how is kenya
The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
