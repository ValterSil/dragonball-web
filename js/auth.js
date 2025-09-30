import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDn7ZNvSN1iO72ZBuv0pEJd0-zgSUM-Mbw",
  authDomain: "dragonball-web-5deb6.firebaseapp.com",
  projectId: "dragonball-web-5deb6",
  storageBucket: "dragonball-web-5deb6.firebasestorage.app",
  messagingSenderId: "263461297583",
  appId: "1:263461297583:web:8e3241926747050f1a635a"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);


// Elementos
const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const messageEl = document.getElementById('auth-message');
const logoutBtn = document.getElementById('logout-button');

// Salvar perfil
function saveUserProfile(uid, email) {
  const userDoc = doc(db, "users", uid);
  return setDoc(userDoc, {
    email,
    createdAt: new Date(),
    characterName: "Nome padrão",
    level: 1,
    power: 0,
    zeni: 0
  }).catch(err => console.error("Erro ao salvar perfil: ", err));
}

// Cadastro
if (registerForm) {
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    messageEl.textContent = '';

    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    createUserWithEmailAndPassword(auth, email, password)
      .then(userCredential => saveUserProfile(userCredential.user.uid, email))
      .then(() => {
        messageEl.textContent = `Cadastro realizado! Bem vindo, ${email}`;
        messageEl.className = 'text-green-400';
        registerForm.reset();
      })
      .catch(error => {
        messageEl.textContent = 'Erro no cadastro: ' + error.message;
        messageEl.className = 'text-red-500';
      });
  });
}

// Login
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    messageEl.textContent = '';

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    signInWithEmailAndPassword(auth, email, password)
      .then(() => {
        messageEl.textContent = 'Login efetuado com sucesso!';
        messageEl.className = 'text-green-400';
        loginForm.reset();
      })
      .catch(error => {
        messageEl.textContent = 'Erro no login: ' + error.message;
        messageEl.className = 'text-red-500';
      });
  });
}

// Logout
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    signOut(auth)
      .then(() => {
        messageEl.textContent = 'Desconectado com sucesso.';
        messageEl.className = 'text-yellow-400';
      })
      .catch(error => {
        messageEl.textContent = 'Erro ao desconectar: ' + error.message;
        messageEl.className = 'text-red-500';
      });
  });
}

// Estado de autenticação
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("Usuário logado:", user.email);
    messageEl.textContent = `Logado como: ${user.email}`;

    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      console.log("Dados do perfil:", data);
      // Atualizar UI com dados do usuário
    }
  } else {
    console.log("Nenhum usuário logado.");
    messageEl.textContent = 'Por favor faça login.';
  }
});
