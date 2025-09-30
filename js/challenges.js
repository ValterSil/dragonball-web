// challenges.js
import { auth, db } from './auth.js';
import { doc, collection, getDocs, query, where, updateDoc, onSnapshot, arrayUnion, setDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { loadView } from './main.js';
import { playerStats } from './main.js';

const currentUserId = () => auth.currentUser.uid;

// Marca jogador como online ao carregar a tela
export async function loadChallengesScreen() {
    const mainContent = document.getElementById('main-content-area');
    mainContent.innerHTML = '<h2 class="text-xl font-bold text-yellow-400 mb-4">Jogadores Online</h2><div id="players-list"></div>';

    // Marca o jogador logado como online
    const currentUserRef = doc(db, "users", currentUserId());
    await updateDoc(currentUserRef, { online: true }).catch(() => {
        console.warn("Erro ao marcar online");
    });

    const usersRef = collection(db, "users");
    const q = query(usersRef, where("online", "==", true));
    const snapshot = await getDocs(q);

    const listDiv = document.getElementById('players-list');
    snapshot.forEach(docSnap => {
        const player = docSnap.data();
        if (docSnap.id !== currentUserId()) { // ignora você mesmo
            const btn = document.createElement('button');
            btn.textContent = player.characterName;
            btn.className = "block w-full mb-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded";
            btn.onclick = () => invitePlayer(docSnap.id, player.characterName);
            listDiv.appendChild(btn);
        }
    });

    listenForInvites();
}

// Envia convite para outro jogador
async function invitePlayer(opponentId, opponentName) {
    const inviteRef = doc(db, "pvpInvites", opponentId);
    await updateDoc(inviteRef, {
        invites: arrayUnion({ from: currentUserId(), timestamp: new Date() })
    }).catch(async () => {
        await setDoc(inviteRef, { invites: [{ from: currentUserId(), timestamp: new Date() }] });
    });
    alert(`Convite enviado para ${opponentName}`);
}

// Escuta convites recebidos
function listenForInvites() {
    const inviteRef = doc(db, "pvpInvites", currentUserId());
    onSnapshot(inviteRef, async (snapshot) => {
        const data = snapshot.data();
        if (!data || !data.invites || data.invites.length === 0) return;

        const invite = data.invites[0];
        if (invite.from !== currentUserId()) {
            const accept = confirm(`Você recebeu um convite de duelo! Aceitar?`);
            if (accept) {
                await startPvpMatch(currentUserId(), invite.from);
            }
            // remove o convite aceito/rejeitado
            await updateDoc(inviteRef, { invites: [] });
        }
    });
}

// Cria a partida PvP
async function startPvpMatch(player1Id, player2Id) {
    // Cria doc da partida com stats iniciais do jogador
    const matchRef = doc(collection(db, "pvpMatches"));
    const initialStats = {
        health: playerStats.health,
        ki: playerStats.ki,
        power: playerStats.power,
        defense: playerStats.defense,
        level: playerStats.level,
        zeni: playerStats.coins,
        attributes: { ...playerStats.attributes },
        attributePoints: playerStats.attributePoints,
        upgrades: [...playerStats.upgrades],
        learnedTechniques: [...playerStats.learnedTechniques]
    };

    await setDoc(matchRef, {
        player1: { uid: player1Id, stats: initialStats, lastActionAt: new Date() },
        player2: { uid: player2Id, stats: initialStats, lastActionAt: new Date() },
        turn: player1Id,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date()
    });

    // Carrega a tela de combate PvP
    window.loadView('pvp-combat', { matchId: matchRef.id });
}

window.loadChallengesScreen = loadChallengesScreen;
