"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ConnectButton,
  useCurrentAccount,
} from "@mysten/dapp-kit";
import {
  Download,
  FileText,
  Inbox,
  LogOut,
  Plus,
  Settings,
  Waves,
} from "lucide-react";
import { cn, shortAddress } from "@/lib/utils";

const NAV = [
  { href: "/app", label: "Forms", Icon: FileText },
  { href: "/app/inbox", label: "Inbox", Icon: Inbox },
  { href: "/app/exports", label: "Exports", Icon: Download },
  { href: "/app/settings", label: "Settings", Icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const account = useCurrentAccount();

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <aside className="hidden md:flex w-56 shrink-0 border-r border-border flex-col">
        <div className="px-4 py-4 border-b border-border">
          <Link href="/" className="flex items-center gap-2 font-semibold text-sm">
            <Waves className="h-4 w-4 text-sky-500" />
            Tideform
          </Link>
        </div>

        <Link
          href="/app/new"
          className="mx-3 mt-3 mb-2 inline-flex items-center justify-center gap-1.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium h-8 px-3 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New form
        </Link>

        <nav className="px-2 py-2 flex-1 space-y-0.5">
          {NAV.map(({ href, label, Icon }) => {
            const active =
              pathname === href || (href !== "/app" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                  active
                    ? "bg-accent text-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3 space-y-2">
          {account ? (
            <div className="flex items-center justify-between gap-2 text-xs">
              <code className="text-muted-foreground font-mono truncate">
                {shortAddress(account.address)}
              </code>
              <LogOut className="h-3 w-3 text-muted-foreground" />
            </div>
          ) : (
            <ConnectButton />
          )}
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
