// pvpCombat.js
import { auth } from './auth.js';
import { doc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { playerStats } from './main.js';

const db = window.firebaseDb;

let matchId = null;
let matchRef = null;
let currentPlayerId = null;
let opponentId = null;
let matchData = null;

// aaaaaaaaaaaaaaaaaaaaaaaaaaaaa
export function updateCombatUI(opponentStats) {
    if (!opponentStats) return;

    const logElement = document.getElementById('combat-log');
    if (logElement) {
        const div = document.createElement('div');
        div.className = 'log-message text-gray-300';
        div.textContent = `[updateCombatUI] Status do inimigo atualizado: HP=${opponentStats.health}, Ki=${opponentStats.ki}`;
        logElement.prepend(div);
    }
}

// Função para carregar a tela PvP
export function loadPvpCombatScreen(params) {
    console.log('[loadPvpCombatScreen] params:', params);

    matchId = params.matchId;
    currentPlayerId = auth.currentUser.uid;
    matchRef = doc(db, "pvpMatches", matchId);

    onSnapshot(matchRef, snapshot => {
        matchData = snapshot.data();
        console.log('[onSnapshot] matchData:', matchData);

        if (!matchData) return;

        // Identifica o adversário
        opponentId = matchData.player1.uid === currentPlayerId ? matchData.player2.uid : matchData.player1.uid;

        const localPlayerStats = matchData.player1.uid === currentPlayerId ? matchData.player1.stats : matchData.player2.stats;
        const opponentStats = matchData.player1.uid === currentPlayerId ? matchData.player2.stats : matchData.player1.stats;

        // Atualiza stats locais
        playerStats.health = localPlayerStats.health;
        playerStats.ki = localPlayerStats.ki;
        playerStats.power = localPlayerStats.power;
        playerStats.defense = localPlayerStats.defense;
        playerStats.upgrades = { ...localPlayerStats.upgrades };

        // Atualiza UI se já estiver na tela PvP
        if (document.getElementById('combat-log')) {
            updateCombatUI(opponentStats);
        }

        // Checa o status do match
        if (matchData.status === "accepted") {
            console.log('[onSnapshot] Partida aceita! Redirecionando para pvp-combat.html...');
            window.passedParams = { matchId }; // mantém o matchId
            window.location.href = 'pvp-combat.html';
        }

        if (matchData.status === "finished") {
            alert("Partida finalizada!");
        }
    });
}

// Função de ataque
export async function playerAttack(selectedTechnique) {
    if (!matchData || matchData.turn !== currentPlayerId) return;

    const opponentStats = matchData.player1.uid === currentPlayerId ? matchData.player2.stats : matchData.player1.stats;

    const damage = (selectedTechnique.power || 10) - (opponentStats.defense || 0);
    opponentStats.health -= Math.max(damage, 0);

    updateCombatUI(opponentStats);

    const newTurn = opponentId;

    const update = matchData.player1.uid === currentPlayerId
        ? { "player2.stats": opponentStats, turn: newTurn, updatedAt: new Date() }
        : { "player1.stats": opponentStats, turn: newTurn, updatedAt: new Date() };

    await updateDoc(matchRef, update);

    const logElement = document.getElementById('game-log');
    if (logElement) {
        const div = document.createElement('div');
        div.className = 'log-message text-gray-300';
        div.textContent = `Você usou ${selectedTechnique.name} e causou ${Math.max(damage, 0)} de dano!`;
        logElement.prepend(div);
    }
}
