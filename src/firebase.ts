import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot,
  getDocs,
  query,
  orderBy,
  deleteDoc
} from 'firebase/firestore';

// Credentials retrieved from firebase-applet-config.json
const firebaseConfig = {
  projectId: "metaranews-1377d",
  appId: "1:706461689572:web:c61ac49246995347f16ef1",
  apiKey: "AIzaSyCkJMYYcFY0J4fyc7txj_CNvM8VnIO0Dqo",
  authDomain: "metaranews-1377d.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-69c184d0-5b30-47d2-b410-4a23184e9310",
  storageBucket: "metaranews-1377d.firebasestorage.app",
  messagingSenderId: "706461689572"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'STAFF';
  password?: string;
}

// Pre-defined profiles from user instructions/image
export const PREDEFINED_PROFILES = [
  {
    name: "Obym Rifdillah",
    email: "febrymal.rifdillah@gmail.com",
    role: "ADMIN" as const,
    defaultPassword: "kalel123"
  },
  {
    name: "Budi Santoso",
    email: "budi.manager@supplierku.com",
    role: "MANAGER" as const,
    defaultPassword: "managermasuk"
  },
  {
    name: "Lala",
    email: "coba1@coba.com",
    role: "STAFF" as const,
    defaultPassword: "staffmasuk"
  }
];

// Self-healing Auth helper: checks the Firestore database users collection first
export async function secureLogin(email: string, password: string): Promise<UserProfile> {
  const cleanEmail = email.trim().toLowerCase();
  
  // 1. Check in Firestore users collection
  const usersRef = collection(db, "users");
  const snapshot = await getDocs(usersRef);
  let dbUsers: UserProfile[] = [];
  snapshot.forEach((docSnap) => {
    dbUsers.push({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
  });

  // Try to find matching user in DB
  let matchedUser = dbUsers.find(u => u.email.toLowerCase() === cleanEmail);

  // Auto-update password if database already exists but has old password for febrymal.rifdillah@gmail.com
  if (matchedUser && cleanEmail === "febrymal.rifdillah@gmail.com" && password === "kalel123" && matchedUser.password !== "kalel123") {
    matchedUser.password = "kalel123";
    await setDoc(doc(db, "users", matchedUser.uid), {
      name: matchedUser.name,
      email: matchedUser.email,
      role: matchedUser.role,
      password: "kalel123"
    });
  }

  // 2. If not found in DB, check if matched predefined profile to auto-register
  if (!matchedUser) {
    const matchedPredefined = PREDEFINED_PROFILES.find(p => p.email.toLowerCase() === cleanEmail);
    if (matchedPredefined) {
      if (password === matchedPredefined.defaultPassword) {
        // Auto register in database
        const uid = `u-${Date.now()}`;
        const newProfile: UserProfile = {
          uid,
          name: matchedPredefined.name,
          email: cleanEmail,
          role: matchedPredefined.role,
          password: matchedPredefined.defaultPassword
        };
        await setDoc(doc(db, "users", uid), {
          name: newProfile.name,
          email: cleanEmail,
          role: newProfile.role,
          password: newProfile.password
        });
        return newProfile;
      } else {
        throw new Error("Password yang Anda masukkan salah.");
      }
    } else {
      throw new Error("Alamat email tidak terdaftar.");
    }
  }

  // 3. Match against stored database password
  const storedPassword = matchedUser.password || '';
  if (password === storedPassword) {
    return matchedUser;
  } else {
    throw new Error("Password yang Anda masukkan salah.");
  }
}
