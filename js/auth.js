// js/auth.js

(() => {
  const auth = window.firebaseAuth;
  const db = window.firebaseDb;

  const registerForm = document.getElementById('register-form');
  const loginForm = document.getElementById('login-form');
  const messageEl = document.getElementById('auth-message');
  const logoutBtn = document.getElementById('logout-button');



  function saveUserProfile(uid, email) {
    return setDoc(doc(db, "users", uid), {
      email: email,
      createdAt: new Date(),
      characterName: "Nome padrão",
      level: 1,
      power: 0,
      zeni: 0
    }).catch(err => console.error("Erro ao salvar perfil: ", err));
  }

  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      messageEl.textContent = '';

      const email = document.getElementById('register-email').value;
      const password = document.getElementById('register-password').value;

      auth.createUserWithEmailAndPassword(email, password)
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

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      messageEl.textContent = '';

      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      auth.signInWithEmailAndPassword(email, password)
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

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      auth.signOut()
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

  auth.onAuthStateChanged(async user => {
    if (user) {
      console.log("Usuário logado:", user.email);
      messageEl.textContent = `Logado como: ${user.email}`;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        console.log("Dados do perfil:", data);
        // Atualize seu frontend exibindo os dados do usuário (nome, level, zeni etc)
      }
    } else {
      console.log("Nenhum usuário logado.");
      messageEl.textContent = 'Por favor faça login.';
    }
  });
})();
