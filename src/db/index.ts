import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

const app = admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.PROJECT_ID,
    privateKey: process.env.PRIVATE_KEY?.replace(/\\n/g, "\n"),
    clientEmail: process.env.CLIENT_EMAIL,
  }),
});

// cont storageBucket: "enoki-443a2.appspot.com",
const db = getFirestore(app);
const authenticate = getAuth(app);
const bucket = getStorage(app).bucket('gs://enoki-443a2.appspot.com/')

export { db, authenticate, bucket };
