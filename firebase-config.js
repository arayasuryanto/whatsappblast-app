// Firebase Configuration
// Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com/",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

// Initialize Firebase
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

export { database, auth };

// For ES5 compatibility (browser)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { firebaseConfig, database, auth };
}