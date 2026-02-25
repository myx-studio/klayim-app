"use client";

import MarketingFooter from "./footer";
import MarketingHeader from "./header";

const MarketingLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen w-full flex-col items-start justify-start">
      <MarketingHeader />
      <main className="flex min-h-screen w-full flex-col items-start justify-start">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
};

export default MarketingLayout;
