import type { Metadata } from "next";
import WckClient from "./WckClient";

export const metadata: Metadata = {
  title: "WCK Student Affiliate Card | DEKUWEC",
  description:
    "Apply for your Wildlife Clubs of Kenya (WCK) student affiliate card through DEKUWEC and pay via M-Pesa.",
  openGraph: {
    title: "WCK Student Affiliate Card | DEKUWEC",
    description:
      "Apply for your Wildlife Clubs of Kenya (WCK) student affiliate card through DEKUWEC and pay via M-Pesa.",
    type: "website",
    images: [{ url: "/wck-logo.png", alt: "Wildlife Clubs of Kenya logo" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/wck-logo.png"],
  },
};

export default function WckPage() {
  return <WckClient />;
}
