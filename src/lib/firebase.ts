import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyDMBbD68p2-rFvxoJt32iXnS_eC9g_putA",
    authDomain: "base45-svelte.firebaseapp.com",
    projectId: "base45-svelte",
    storageBucket: "base45-svelte.appspot.com",
    messagingSenderId: "1077639412447",
    appId: "1:1077639412447:web:2aa648620cb288b26bc76a",
    measurementId: "G-ZMBJMELS5T"
  };

  // Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore();
export const auth = getAuth();
export const storage = getStorage();