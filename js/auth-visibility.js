// js/auth-visibility.js

import { loadPlayerState, loadView, playerStats } from './main.js';

const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-button');
const authMessage = document.getElementById('auth-message');
const mainContent = document.getElementById('main-content-area');

function showAuthForms() {
  registerForm.style.display = 'block';
  loginForm.style.display = 'block';
  logoutBtn.style.display = 'none';
  mainContent.querySelector('p.text-center')?.classList.add('hidden');
}

function showGameContent() {
  registerForm.style.display = 'none';
  loginForm.style.display = 'none';
  logoutBtn.style.display = 'block';
  mainContent.querySelector('p.text-center')?.classList.remove('hidden');
}

// Inicialmente mostrar formulários
showAuthForms();

firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    authMessage.textContent = `Logado como: ${user.email}`;
    authMessage.className = 'text-green-400 text-center my-4';

    await loadPlayerState();

    if (!playerStats.race) {
      await loadView('character-creation');
    } else {
      await loadView('status');
    }
    showGameContent();
  } else {
    authMessage.textContent = 'Por favor faça login ou cadastre-se';
    authMessage.className = 'text-yellow-400 text-center my-4';
    showAuthForms();
  }
});
