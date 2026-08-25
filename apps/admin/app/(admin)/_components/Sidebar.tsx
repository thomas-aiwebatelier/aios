"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./SignOutButton";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Aanvragen" },
  { href: "/discovery", label: "Discovery Queue" },
  { href: "/approval", label: "Approval Queue" },
  { href: "/build", label: "Build" },
  { href: "/video", label: "Video" },
  { href: "/market", label: "Market" },
  { href: "/operate", label: "Operate" },
  { href: "/sites", label: "Sites", placeholder: true },
  { href: "/blog", label: "Blog" },
  { href: "/communication", label: "Communication", placeholder: true },
  { href: "/settings", label: "Settings", placeholder: true },
];

interface SidebarProps {
  userEmail?: string | null;
  /**
   * Unhandled front-door requests. The public site promises a reply within 24
   * hours on four pages, and sending mail is admin-only — so this badge is the
   * notification. Without it you only find out by remembering to look.
   */
  newLeadCount?: number;
}

export function Sidebar({ userEmail, newLeadCount = 0 }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 h-screen sticky top-0 bg-stone-50 border-r border-stone-200 flex flex-col">
      <div className="px-4 pt-6 pb-4 border-b border-stone-200">
        <div className="text-sm font-semibold text-stone-800 leading-tight">AI Web Atelier</div>
        <div className="text-xs text-stone-500 mt-0.5">admin</div>
        {userEmail && (
          <div className="text-xs text-stone-400 mt-1 truncate">{userEmail}</div>
        )}
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
          const isPlaceholder = link.placeholder;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={[
                "flex items-center px-4 py-2 text-sm transition-colors",
                isActive
                  ? "border-l-2 border-indigo-600 bg-indigo-50 text-indigo-700 font-medium pl-[14px]"
                  : "border-l-2 border-transparent text-stone-600 hover:bg-stone-100 hover:text-stone-900 pl-[14px]",
                isPlaceholder ? "opacity-60" : "",
              ].join(" ")}
            >
              <span className="flex-1">{link.label}</span>
              {link.href === "/leads" && newLeadCount > 0 && (
                <span
                  className="ml-2 rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white"
                  aria-label={`${newLeadCount} nieuwe aanvragen`}
                >
                  {newLeadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-stone-200">
        <SignOutButton />
      </div>
    </aside>
  );
}
