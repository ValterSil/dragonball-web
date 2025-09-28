// js/auth.js

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

const auth = getAuth();
const db = getFirestore();

const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const messageEl = document.getElementById('auth-message');
const logoutBtn = document.getElementById('logout-button');

// Função para salvar perfil básico no Firestore
async function saveUserProfile(uid, email) {
    try {
        await setDoc(doc(db, "users", uid), {
            email: email,
            createdAt: new Date(),
            characterName: "Nome padrão",
            level: 1,
            power: 0,
            zeni: 0
        });
    } catch (err) {
        console.error("Erro ao salvar perfil: ", err);
    }
}

// Cadastro
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageEl.textContent = '';

        const email = registerForm['email'].value;
        const password = registerForm['password'].value;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await saveUserProfile(userCredential.user.uid, email);
            messageEl.textContent = `Cadastro realizado! Bem vindo, ${email}`;
            messageEl.className = 'text-green-400';
            registerForm.reset();
        } catch (error) {
            messageEl.textContent = 'Erro no cadastro: ' + error.message;
            messageEl.className = 'text-red-500';
        }
    });
}

// Login
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        messageEl.textContent = '';

        const email = loginForm['email'].value;
        const password = loginForm['password'].value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            messageEl.textContent = `Login efetuado com sucesso!`;
            messageEl.className = 'text-green-400';
            loginForm.reset();
        } catch (error) {
            messageEl.textContent = 'Erro no login: ' + error.message;
            messageEl.className = 'text-red-500';
        }
    });
}

// Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            messageEl.textContent = 'Desconectado com sucesso.';
            messageEl.className = 'text-yellow-400';
        } catch (error) {
            messageEl.textContent = 'Erro ao desconectar: ' + error.message;
            messageEl.className = 'text-red-500';
        }
    });
}

// Detecta mudança na autenticação e pode atualizar UI / carregar dados
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("Usuário logado:", user.email);
        messageEl.textContent = `Logado como: ${user.email}`;

        // Exemplo: carregar perfil e atualizar UI
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            console.log("Dados do perfil:", data);
            // Atualize seu frontend exibindo dados (nome, level, zeni etc)
        }
    } else {
        console.log("Nenhum usuário logado.");
        messageEl.textContent = 'Por favor faça login.';
    }
});
