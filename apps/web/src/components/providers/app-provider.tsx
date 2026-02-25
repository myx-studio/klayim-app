"use client";

import { AnalyticsProvider } from "@/components/providers/analytics-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePathname } from "next/navigation";
import MarketingLayout from "../layouts/marketings";
const AppProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const pathName = usePathname();
  const isMarketingPage = !pathName.startsWith("/app");
  return (
    <SessionProvider>
      <QueryProvider>
        <AnalyticsProvider>
          <TooltipProvider>
            {isMarketingPage ? <MarketingLayout>{children}</MarketingLayout> : children}
            <Toaster />
          </TooltipProvider>
        </AnalyticsProvider>
      </QueryProvider>
    </SessionProvider>
  );
};

export default AppProvider;
