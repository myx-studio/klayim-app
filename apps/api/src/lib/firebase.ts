import { initializeApp, getApps, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage, Storage } from "firebase-admin/storage";
import { getAuth, Auth } from "firebase-admin/auth";

let app: App;

if (getApps().length === 0) {
  app = initializeApp();
} else {
  app = getApps()[0];
}

export const firestore: Firestore = getFirestore(app);
export const storage: Storage = getStorage(app);
export const auth: Auth = getAuth(app);

export { app };
