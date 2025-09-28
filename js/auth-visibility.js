// js/auth-visibility.js

import { loadPlayerState, loadView, playerStats, updateUI } from './main.js';

// Elementos de formulário e mensagem
const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-button');
const authMessage = document.getElementById('auth-message');

/**
 * Mostra os formulários de login e cadastro,
 * escondendo o botão de logout e atualizando a mensagem.
 */
function showAuthForms() {
  registerForm.style.display = 'block';
  loginForm.style.display = 'block';
  logoutBtn.style.display = 'none';
  authMessage.textContent = 'Por favor faça login ou cadastre-se';
  authMessage.className = 'text-yellow-400 text-center my-4';
}

/**
 * Esconde os formulários de login e cadastro,
 * mostra o botão de logout e limpa a mensagem.
 */
function hideAuthForms() {
  registerForm.style.display = 'none';
  loginForm.style.display = 'none';
  logoutBtn.style.display = 'block';
  authMessage.textContent = '';
  authMessage.className = '';
}

// Chama a função para mostrar os formulários inicialmente (caso ninguém esteja logado)
showAuthForms();

// Observa mudanças no estado de autenticação Firebase
firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    // Usuário está logado
    hideAuthForms();
    authMessage.textContent = `Logado como: ${user.email}`;
    authMessage.className = 'text-green-400 text-center my-4';

    // Carrega estado salvo e aguarda término
    await loadPlayerState();

    // Decide se mostra criação de personagem ou tela de status
    if (!playerStats.race) {
      await loadView('character-creation');
    } else {
      await loadView('status');
      updateUI(); // Atualiza a sidebar e tela de status
    }
  } else {
    // Usuário não está logado, mostra os formulários e mensagem de login
    showAuthForms();

    // Opcional: limpe ou recarregue a view principal do jogo aqui se desejar
  }
});
