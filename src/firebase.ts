/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';

// Credentials derived from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyA4tMLUwUTcFwWZuyImTgj7HDPdvaWy4LU",
  authDomain: "metaranews-fe15d.firebaseapp.com",
  projectId: "metaranews-fe15d",
  storageBucket: "metaranews-fe15d.firebasestorage.app",
  messagingSenderId: "186582031482",
  appId: "1:186582031482:web:93633009dc46bef3832fc3",
  measurementId: "G-8FMZW93RL8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore with long-polling to prevent websocket handshake timeouts in sandboxed container/iframe preview environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, "ai-studio-69c184d0-5b30-47d2-b410-4a23184e9310");

export { collection, doc, getDocs, setDoc, deleteDoc, updateDoc };
