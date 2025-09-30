import { auth, db } from './auth.js';
import { doc, collection, getDocs, query, where, updateDoc, setDoc, arrayUnion, onSnapshot, Timestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
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
      const accept = confirm(`Você recebeu um convite de duelo! Aceitar?`);
      if (accept) {
        const matchId = await startPvpMatch(currentUserId, invite.from);
        await activateMatch(matchId);
      }
      await updateDoc(inviteRef, { invites: [] }).catch(() => {});
    }
  });
}

let currentMatchId = null;

export async function startPvpMatch(player1Id, player2Id) {
  const matchRef = doc(collection(db, "pvpMatches"));

  // Stats iniciais - aqui usa o playerStats que deve estar atualizado
  const initialStats = {
    health: playerStats.health || 100,
    ki: playerStats.ki || 50,
    power: playerStats.power || 10,
    defense: playerStats.defense || 5,
    upgrades: { ...playerStats.upgrades }
  };

  await setDoc(matchRef, {
    player1: { uid: player1Id, stats: initialStats, lastActionAt: new Date() },
    player2: { uid: player2Id, stats: initialStats, lastActionAt: new Date() },
    turn: player1Id,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date()
  });

  currentMatchId = matchRef.id;
  listenMatchStart(currentMatchId, player1Id, player2Id);
  return currentMatchId;
}

function listenMatchStart(matchId, player1Id, player2Id) {
  const matchDoc = doc(db, "pvpMatches", matchId);
  onSnapshot(matchDoc, snapshot => {
    if (!snapshot.exists()) return;
    const data = snapshot.data();
    if (data.status === 'active') {
      if (auth.currentUser) {
        const currentUserId = auth.currentUser.uid;
        if (currentUserId === player1Id || currentUserId === player2Id) {
          loadView('pvp-combat', { matchId });
        }
      }
    }
  });
}

window.loadChallengesScreen = loadChallengesScreen;
