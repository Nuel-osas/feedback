"use client";

import Link from "next/link";
import { ConnectButton } from "@mysten/dapp-kit";
import { Waves } from "lucide-react";

export function TopBar() {
  return (
    <header className="border-b border-border sticky top-0 z-40 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Waves className="h-5 w-5 text-sky-500" />
          <span>Tideform</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/app" className="text-muted-foreground hover:text-foreground">
            Dashboard
          </Link>
          <Link href="/app/new" className="text-muted-foreground hover:text-foreground">
            New form
          </Link>
          <ConnectButton />
        </nav>
      </div>
    </header>
  );
}
