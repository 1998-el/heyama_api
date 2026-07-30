import { Injectable, OnModuleInit } from '@nestjs/common';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private app: App;
  public auth: Auth;
  public firestore: Firestore;
  public storage: Storage;

  async onModuleInit() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Firebase environment variables are missing');
    }

    if (!getApps().length) {
      this.app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        storageBucket: storageBucket || `${projectId}.appspot.com`,
      });
    } else {
      this.app = getApps()[0];
    }

    this.auth = getAuth(this.app);
    this.firestore = getFirestore(this.app);
    this.storage = getStorage(this.app);
  }

  getAuthInstance(): Auth {
    return this.auth;
  }

  getFirestoreInstance(): Firestore {
    return this.firestore;
  }

  getStorageInstance(): Storage {
    return this.storage;
  }
}
