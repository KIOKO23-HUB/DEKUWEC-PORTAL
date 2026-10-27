import type { Metadata } from "next";
import LeadershipClient from "./LeadershipClient";

export const metadata: Metadata = {
  title: "Leadership Elections | DEKUWEC",
  description:
    "Apply for a DEKUWEC executive position, follow the election activity dates, and view approved applicants.",
};

export default function LeadershipPage() {
  return <LeadershipClient />;
}
