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
  updateDoc,
  onSnapshot
} from 'firebase/firestore';

// Credentials derived from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyBgeG7fd_L_goQcWoWkVU5kFV65GXERj3c",
  authDomain: "radiant-cedar-9fjbn.firebaseapp.com",
  projectId: "radiant-cedar-9fjbn",
  storageBucket: "radiant-cedar-9fjbn.firebasestorage.app",
  messagingSenderId: "1071337621535",
  appId: "1:1071337621535:web:987997de4f137c81aead2a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore with long-polling to prevent websocket handshake timeouts in sandboxed container/iframe preview environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, "ai-studio-69c184d0-5b30-47d2-b410-4a23184e9310");

export { collection, doc, getDocs, setDoc, deleteDoc, updateDoc, onSnapshot };
