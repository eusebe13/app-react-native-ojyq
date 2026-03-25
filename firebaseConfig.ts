// firebaseConfig.ts
import { getApps, initializeApp } from 'firebase/app';
import { Auth, browserLocalPersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId:     process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Évite de ré-initialiser l'app si elle existe déjà (hot reload, etc.)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Auth avec persistance adaptée à la plateforme
let auth: Auth;

if (Platform.OS === 'web') {
  // Web : browserLocalPersistence (localStorage natif du navigateur)
  auth = initializeAuth(app, {
    persistence: browserLocalPersistence,
  });
} else {
  // iOS / Android : AsyncStorage via require() pour éviter que Metro
  // résolve getReactNativePersistence dans le bundle web (cause l'erreur
  // "is not a function" sur le web car la fonction n'y est pas exportée)
  const { getReactNativePersistence } = require('firebase/auth');
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;

  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

const db = getFirestore(app);
const functions = getFunctions(app, 'us-central1');

// Configuration pour l'émulateur en développement (optionnel)
// if (process.env.NODE_ENV === 'development') {
//   connectFunctionsEmulator(functions, 'localhost', 5001);
// }

export { app, auth, db, functions };
