// challenges.js
import { auth } from './auth.js'; 
import { doc, collection, getDocs, query, where, updateDoc, setDoc, arrayUnion, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { loadView } from './main.js';
import { playerStats } from './main.js';

const db = window.firebaseDb;
const currentUserId = auth.currentUser.uid;

export async function loadChallengesScreen() {
    const mainContent = document.getElementById('main-content-area');
    mainContent.innerHTML = `
        <h2 class="text-xl font-bold text-yellow-400 mb-4">Jogadores Online</h2>
        <div id="players-list"></div>
    `;

    const usersRef = collection(db, "users");
    const q = query(usersRef, where("online", "==", true));
    const snapshot = await getDocs(q);

    const listDiv = document.getElementById('players-list');
    snapshot.forEach(docSnap => {
        const player = docSnap.data();
        if (docSnap.id !== currentUserId) { // ignora você mesmo
            const btn = document.createElement('button');
            btn.textContent = player.characterName || "Jogador";
            btn.className = "block w-full mb-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded";
            btn.onclick = () => invitePlayer(docSnap.id, player.characterName || "Jogador");
            listDiv.appendChild(btn);
        }
    });

    listenForInvites();
}

async function invitePlayer(opponentId, opponentName) {
    const inviteRef = doc(db, "pvpInvites", opponentId); 
    try {
        await updateDoc(inviteRef, {
            invites: arrayUnion({ from: currentUserId, timestamp: new Date() })
        });
    } catch (err) {
        await setDoc(inviteRef, { invites: [{ from: currentUserId, timestamp: new Date() }] });
    }
    alert(`Convite enviado para ${opponentName}`);
}

function listenForInvites() {
    const inviteRef = doc(db, "pvpInvites", currentUserId);
    onSnapshot(inviteRef, async (snapshot) => {
        const data = snapshot.data();
        if (!data || !data.invites || data.invites.length === 0) return;

        const invite = data.invites[0];
        if (invite.from !== currentUserId) { 
            const accept = confirm(`Você recebeu um convite de duelo! Aceitar?`);
            if (accept) {
                await startPvpMatch(currentUserId, invite.from);
            }
            await updateDoc(inviteRef, { invites: [] });
        }
    });
}

// Atualizado para criar o documento e guardar o ID
let currentMatchId = null;

async function startPvpMatch(player1Id, player2Id) {
    const matchRef = doc(collection(db, "pvpMatches"));

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
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date()
    });

    currentMatchId = matchRef.id;

    // Aqui notificamos ambos jogadores para abrir a view 'pvp-combat'
    // Você pode usar outro mecanismo para isso, por exemplo firestore onSnapshot no cliente!
    
    await loadView('pvp-combat', { matchId: currentMatchId });
}

window.loadChallengesScreen = loadChallengesScreen;
