/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  updateDoc 
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

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export { collection, doc, getDocs, setDoc, deleteDoc, updateDoc };
