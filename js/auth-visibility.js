import { loadView, playerStats, updateUI } from './main.js';
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const db = getFirestore();
const auth = getAuth();

// Outras partes do código...

firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    hideAuthForms();
    authMessage.textContent = `Logado como: ${user.email}`;
    authMessage.className = 'text-green-400 text-center my-4';

    // Carregar dados do Firestore
    const data = await loadPlayerData();
    if (data) {
      Object.assign(playerStats, data);
      updateUI();
      await loadView('status');
    } else {
      await loadView('character-creation');
    }
  } else {
    showAuthForms();
  }
});

async function loadPlayerData() {
  const user = auth.currentUser;
  if (!user) return null;

  const userDoc = doc(db, "players", user.uid);
  const docSnap = await getDoc(userDoc);
  if (docSnap.exists()) {
    return docSnap.data();
  } 
  return null;
}
