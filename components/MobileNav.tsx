"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  KeyRound,
  CreditCard,
  FileText,
  Users,
} from "lucide-react";

const NAV = [
  { label: "Home", href: "/", icon: LayoutDashboard },
  { label: "Passwords", href: "/passwords", icon: KeyRound },
  { label: "Cards", href: "/cards", icon: CreditCard },
  { label: "Docs", href: "/documents", icon: FileText },
  { label: "People", href: "/family", icon: Users },
];

export default function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="mobile-nav">
      {NAV.map(({ label, href, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`mobile-nav-item ${(href === "/" ? pathname === "/" : pathname.startsWith(href)) ? "active" : ""}`}
        >
          <Icon size={20} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
