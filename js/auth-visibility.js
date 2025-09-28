// js/auth-visibility.js

// Elementos principais
const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-button');
const authMessage = document.getElementById('auth-message');
const mainContent = document.getElementById('main-content-area');

// Função para mostrar apenas a tela de login/cadastro (usuário não logado)
function showAuthForms() {
  registerForm.style.display = 'block';
  loginForm.style.display = 'block';
  logoutBtn.style.display = 'none';
  mainContent.querySelector('p.text-center')?.classList.add('hidden'); // ocultar "carregando..."
}

// Função para mostrar conteúdo do jogo (usuário logado)
function showGameContent() {
  registerForm.style.display = 'none';
  loginForm.style.display = 'none';
  logoutBtn.style.display = 'block';
  mainContent.querySelector('p.text-center')?.classList.remove('hidden'); // mostrar "carregando..."
}

// Inicializa visibilidade como não autenticado
showAuthForms();

// Usa Firebase onAuthStateChanged (supondo que auth está configurado globalmente)
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    authMessage.textContent = `Logado como: ${user.email}`;
    authMessage.className = 'text-green-400 text-center my-4';
    showGameContent();
  } else {
    authMessage.textContent = 'Por favor faça login ou cadastre-se';
    authMessage.className = 'text-yellow-400 text-center my-4';
    showAuthForms();
  }
});
