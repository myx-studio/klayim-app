"use client";

import Script from "next/script";
import { createContext, useCallback, useContext, useState } from "react";

interface RecaptchaContextType {
  isLoaded: boolean;
  executeRecaptcha: (action: string) => Promise<string | null>;
}

const RecaptchaContext = createContext<RecaptchaContextType>({
  isLoaded: false,
  executeRecaptcha: async () => null,
});

export const useRecaptcha = () => useContext(RecaptchaContext);

interface RecaptchaProviderProps {
  children: React.ReactNode;
  siteKey: string;
}

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export const RecaptchaProvider = ({ children, siteKey }: RecaptchaProviderProps) => {
  const [isLoaded, setIsLoaded] = useState(false);

  const executeRecaptcha = useCallback(
    async (action: string): Promise<string | null> => {
      if (!isLoaded || !window.grecaptcha) {
        console.warn("reCAPTCHA not loaded yet");
        return null;
      }

      try {
        return await new Promise((resolve) => {
          window.grecaptcha.ready(async () => {
            const token = await window.grecaptcha.execute(siteKey, { action });
            resolve(token);
          });
        });
      } catch (error) {
        console.error("reCAPTCHA execution failed:", error);
        return null;
      }
    },
    [isLoaded, siteKey]
  );

  return (
    <RecaptchaContext.Provider value={{ isLoaded, executeRecaptcha }}>
      <Script
        src={`https://www.google.com/recaptcha/api.js?render=${siteKey}`}
        onLoad={() => setIsLoaded(true)}
      />
      {children}
    </RecaptchaContext.Provider>
  );
};
