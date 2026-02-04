import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDDHLRd8aZXHgzuQaxGbh34bmxuGgpjS44",
  authDomain: "chatapplication-999d4.firebaseapp.com",
  projectId: "chatapplication-999d4",
  storageBucket: "chatapplication-999d4.firebasestorage.app",
  messagingSenderId: "793131392553",
  appId: "1:793131392553:web:0ec8f731f81904910cc638",
  measurementId: "G-Z91SDSHKVZ"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const storage = getStorage(app);
