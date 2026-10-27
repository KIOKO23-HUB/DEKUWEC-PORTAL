import type { Metadata } from "next";
import EventsClient from "./EventsClient";

export const metadata: Metadata = {
  title: "Upcoming Events | DEKUWEC",
  description:
    "Register and pay for Dedan Kimathi Wildlife & Environmental Club events via M-Pesa. No portal account needed.",
};

export default function EventsPage() {
  return <EventsClient />;
}
