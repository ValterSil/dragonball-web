import { auth, db } from './auth.js';
import { doc, collection, getDocs, getDoc, query, where, updateDoc, setDoc, arrayUnion, onSnapshot, Timestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { loadView, playerStats } from './main.js';
import { activateMatch } from './pvpCombat.js';

const ONLINE_TIMEOUT_MINUTES = 5; // Intervalo para considerar jogador online

export async function loadChallengesScreen() {
  const user = auth.currentUser;
  if (!user) return console.log('Usuário não autenticado');

  const currentUserId = user.uid;
  const mainContent = document.getElementById('main-content-area');
  mainContent.innerHTML = `
    <h2 class="text-xl font-bold text-yellow-400 mb-4">Jogadores Online</h2>
    <div id="players-list"></div>
  `;
  // Atualiza lastActive do jogador atual para manter online
  try {
    const userRef = doc(db, "users", currentUserId);
    await updateDoc(userRef, { lastActive: Timestamp.now() });
  } catch (error) {
    console.error("Erro ao atualizar lastActive:", error);
  }

  const usersRef = collection(db, "users");
  const timeoutDate = new Date(Date.now() - ONLINE_TIMEOUT_MINUTES * 60 * 1000);
  const q = query(usersRef, where("lastActive", ">", Timestamp.fromDate(timeoutDate)));

  try {
    const snapshot = await getDocs(q);
    const listDiv = document.getElementById('players-list');
    listDiv.innerHTML = ''; // Limpa lista existente

    snapshot.forEach(docSnap => {
      if (docSnap.id !== currentUserId) {
        const player = docSnap.data();
        const btn = document.createElement('button');
        btn.textContent = player.characterName || "Jogador";
        btn.className = "block w-full mb-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded";
        btn.onclick = () => invitePlayer(docSnap.id, player.characterName || "Jogador");
        
        listDiv.appendChild(btn);
      }
    });
  } catch (error) {
    console.error("Erro ao buscar jogadores online:", error);
  }

  listenForInvites(currentUserId);
}

async function invitePlayer(opponentId, opponentName) {
  const user = auth.currentUser;
  if (!user) return alert('Você precisa estar logado para convidar jogadores.');
  const currentUserId = user.uid;
  const inviteRef = doc(db, "pvpInvites", opponentId);
  try {
    await updateDoc(inviteRef, {
      invites: arrayUnion({ from: currentUserId, timestamp: new Date() })
    });
  } catch {
    await setDoc(inviteRef, { invites: [{ from: currentUserId, timestamp: new Date() }] });
  }

  alert(`Convite enviado para ${opponentName}`);
}

function listenForInvites(currentUserId) {
  const inviteRef = doc(db, "pvpInvites", currentUserId);
  onSnapshot(inviteRef, async snapshot => {
    const data = snapshot.data();
    if (!data?.invites?.length) return;

    const invite = data.invites[0];
    if (invite.from !== currentUserId) { 
      const accept = confirm(`Você recebeu um convite de duelo de um jogador! Aceitar?`);
      if (accept) {
        const matchId = await startPvpMatch(currentUserId, invite.from);
        if (matchId) {
            await activateMatch(matchId);
        }
      }
      await updateDoc(inviteRef, { invites: [] }).catch(() => {});
    }
  });
}

export async function startPvpMatch(player1Id, player2Id) {
  const matchRef = doc(collection(db, "pvpMatches"));

  const player1Doc = await getDoc(doc(db, 'users', player1Id));
  const player2Doc = await getDoc(doc(db, 'users', player2Id));

  if (!player1Doc.exists() || !player2Doc.exists()) {
      console.error("Não foi possível encontrar os dados de um dos jogadores.");
      return null;
  }
  
  const player1Data = player1Doc.data();
  const player2Data = player2Doc.data();

  await setDoc(matchRef, {
    player1: { 
        uid: player1Id, 
        name: player1Data.characterName,
        level: player1Data.level, // 🔥 ADICIONADO: Nível do jogador 1
        stats: {
            health: player1Data.maxHealth,
            maxHealth: player1Data.maxHealth,
            ki: player1Data.maxKi,
            maxKi: player1Data.maxKi,
            power: player1Data.power,
            defense: player1Data.defense
        }
    },
    player2: { 
        uid: player2Id, 
        name: player2Data.characterName,
        level: player2Data.level, // 🔥 ADICIONADO: Nível do jogador 2
        stats: {
            health: player2Data.maxHealth,
            maxHealth: player2Data.maxHealth,
            ki: player2Data.maxKi,
            maxKi: player2Data.maxKi,
            power: player2Data.power,
            defense: player2Data.defense
        }
    },
    turn: player1Id,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
    log: []
  });

  return matchRef.id;
}

window.loadChallengesScreen = loadChallengesScreen;
