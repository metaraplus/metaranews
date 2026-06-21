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
  apiKey: "AIzaSyCkJMYYcFY0J4fyc7txj_CNvM8VnIO0Dqo",
  authDomain: "metaranews-1377d.firebaseapp.com",
  projectId: "metaranews-1377d",
  storageBucket: "metaranews-1377d.firebasestorage.app",
  messagingSenderId: "706461689572",
  appId: "1:706461689572:web:c61ac49246995347f16ef1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export { collection, doc, getDocs, setDoc, deleteDoc, updateDoc };
