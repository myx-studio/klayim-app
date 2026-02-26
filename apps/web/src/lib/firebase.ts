import { initializeApp, getApps } from "firebase/app";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";
import { getFunctions, connectFunctionsEmulator, Functions } from "firebase/functions";
import { env } from "next-runtime-env";

const firebaseConfig = {
  apiKey: env("NEXT_PUBLIC_FIREBASE_API_KEY"),
  authDomain: env("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: env("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: env("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: env("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId: env("NEXT_PUBLIC_FIREBASE_APP_ID"),
  measurementId: env("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"),
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Functions
export const functions: Functions = getFunctions(app, "asia-southeast1");

// Connect to emulator in development
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  connectFunctionsEmulator(functions, "localhost", 5001);
}

// Initialize Analytics (only in browser)
let analytics: Analytics | null = null;

export const initAnalytics = async (): Promise<Analytics | null> => {
  if (typeof window !== "undefined" && (await isSupported())) {
    analytics = getAnalytics(app);
  }
  return analytics;
};

export const getAnalyticsInstance = () => analytics;

export default app;
