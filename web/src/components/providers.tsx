"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import "@mysten/dapp-kit/dist/index.css";
import { networks } from "@/lib/sui";
import { env } from "@/lib/env";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={networks} defaultNetwork={env.network}>
          <WalletProvider autoConnect>{children}</WalletProvider>
        </SuiClientProvider>
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
