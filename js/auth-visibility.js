import { loadView, playerStats, updateUI } from './main.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

const auth = window.firebaseAuth;
const db = window.firebaseDb;

function hideAuthForms() {
  // Implemente a função que esconde seus formulários
}
function showAuthForms() {
  // Implemente a função que mostra seus formulários
}
const authMessage = document.getElementById('auth-message');

auth.onAuthStateChanged(async (user) => {
  if (user) {
    hideAuthForms();
    authMessage.textContent = `Logado como: ${user.email}`;
    authMessage.className = 'text-green-400 text-center my-4';

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

  const userDoc = doc(db, 'players', user.uid);
  const docSnap = await getDoc(userDoc);
  if (docSnap.exists()) {
    return docSnap.data();
  }

  return null;
}
