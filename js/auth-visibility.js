import { loadView, playerStats, updateUI } from './main.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { auth, db } from './auth.js';

const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-button');
const authMessage = document.getElementById('auth-message');

function showAuthForms() {
  if (registerForm) registerForm.style.display = 'block';
  if (loginForm) loginForm.style.display = 'block';
  if (logoutBtn) logoutBtn.style.display = 'none';
  authMessage.textContent = '';
}

function hideAuthForms() {
  if (registerForm) registerForm.style.display = 'none';
  if (loginForm) loginForm.style.display = 'none';
  if (logoutBtn) logoutBtn.style.display = 'block';
}

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
    await loadView('login'); // redireciona para a página de registro
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
