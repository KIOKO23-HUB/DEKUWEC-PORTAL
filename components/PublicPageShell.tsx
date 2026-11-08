import Link from "next/link";
import { Camera, ShoppingBag, ShieldCheck, CalendarDays, LayoutDashboard } from "lucide-react";

const links = [
  { href: "/nature-snaps", label: "Nature Snaps", icon: Camera },
  { href: "/merchandise", label: "Merchandise", icon: ShoppingBag },
  { href: "/wck", label: "WCK Card", icon: ShieldCheck },
  { href: "/events", label: "Events", icon: CalendarDays },
];

export default function PublicPageShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: "nature-snaps" | "merchandise" | "wck" | "events";
}) {
  return (
    <div className="flex min-h-screen flex-col bg-emerald-50/40">
      <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <img src="/icon-192.png" alt="DEKUWEC" className="h-9 w-9 rounded-full" />
            <span className="text-lg font-black tracking-tight text-emerald-950">DEKUWEC</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold transition ${
                  active === href.replace("/", "")
                    ? "bg-emerald-100 text-emerald-900"
                    : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-800 sm:text-sm"
          >
            <LayoutDashboard className="h-4 w-4" />
            Portal
          </Link>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>

      <footer className="border-t border-emerald-100 bg-emerald-950 py-8 text-emerald-100">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-black">DEKUWEC</p>
            <p className="text-xs text-emerald-300">Dedan Kimathi Wildlife &amp; Environmental Club</p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs font-semibold">
            {links.map(({ href, label }) => (
              <Link key={href} href={href} className="hover:text-white">
                {label}
              </Link>
            ))}
            <Link href="/dashboard" className="hover:text-white">
              Member Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
