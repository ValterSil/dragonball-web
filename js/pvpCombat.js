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

// Função que atualiza automaticamente a interface
export function updateCombatUI(opponentStats) {
    if (!opponentStats) return;

    // Player
    const playerHealthBar = document.getElementById('player-health-bar');
    const playerHealthVal = document.getElementById('player-health-val');
    const playerKiBar = document.getElementById('player-ki-bar');
    const playerKiVal = document.getElementById('player-ki-val');
    const playerPowerVal = document.getElementById('player-power-val');

    if (playerHealthBar && playerHealthVal && playerKiBar && playerKiVal && playerPowerVal) {
        playerHealthVal.textContent = playerStats.health;
        playerKiVal.textContent = playerStats.ki;
        playerPowerVal.textContent = playerStats.power;

        playerHealthBar.style.width = `${Math.max(0, (playerStats.health / playerStats.maxHealth) * 100)}%`;
        playerKiBar.style.width = `${Math.max(0, (playerStats.ki / playerStats.maxKi) * 100)}%`;
    }

    // Opponent
    const opponentHealthBar = document.getElementById('opponent-health-bar');
    const opponentHealthVal = document.getElementById('opponent-health-val');
    const opponentKiBar = document.getElementById('opponent-ki-bar');
    const opponentKiVal = document.getElementById('opponent-ki-val');
    const opponentPowerVal = document.getElementById('opponent-power-val');

    if (opponentHealthBar && opponentHealthVal && opponentKiBar && opponentKiVal && opponentPowerVal) {
        opponentHealthVal.textContent = opponentStats.health;
        opponentKiVal.textContent = opponentStats.ki;
        opponentPowerVal.textContent = opponentStats.power;

        opponentHealthBar.style.width = `${Math.max(0, (opponentStats.health / opponentStats.maxHealth) * 100)}%`;
        opponentKiBar.style.width = `${Math.max(0, (opponentStats.ki / opponentStats.maxKi) * 100)}%`;
    }
}

// Função para adicionar mensagens no log automaticamente
export function logMessage(message) {
    const logDiv = document.getElementById('combat-log');
    if (!logDiv) return;
    const p = document.createElement('p');
    p.textContent = message;
    logDiv.appendChild(p);
    logDiv.scrollTop = logDiv.scrollHeight;
}

// Carrega a tela PvP e sincroniza com o Firestore
export function loadPvpCombatScreen(params) {
    if (!params.matchId) return;

    matchId = params.matchId;
    currentPlayerId = auth.currentUser.uid;
    matchRef = doc(db, "pvpMatches", matchId);

    onSnapshot(matchRef, snapshot => {
        matchData = snapshot.data();
        if (!matchData) return;

        opponentId = matchData.player1.uid === currentPlayerId ? matchData.player2.uid : matchData.player1.uid;

        const localPlayerStats = matchData.player1.uid === currentPlayerId ? matchData.player1.stats : matchData.player2.stats;
        const opponentStats = matchData.player1.uid === currentPlayerId ? matchData.player2.stats : matchData.player1.stats;

        // Atualiza stats do player local
        Object.assign(playerStats, localPlayerStats);

        // Atualiza a interface automaticamente
        updateCombatUI(opponentStats);

        if (matchData.status === "finished") {
            alert("Partida finalizada!");
        }
    });
}

// Função de ataque
export async function playerAttack(selectedTechnique) {
    if (!matchData || matchData.turn !== currentPlayerId) return;

    const opponentStats = matchData.player1.uid === currentPlayerId ? matchData.player2.stats : matchData.player1.stats;

    const damage = Math.max((selectedTechnique.power || 10) - (opponentStats.defense || 0), 0);
    opponentStats.health -= damage;

    logMessage(`Você usou ${selectedTechnique.name} e causou ${damage} de dano!`);

    const newTurn = opponentId;

    const update = matchData.player1.uid === currentPlayerId
        ? { "player2.stats": opponentStats, turn: newTurn, updatedAt: new Date() }
        : { "player1.stats": opponentStats, turn: newTurn, updatedAt: new Date() };

    await updateDoc(matchRef, update);

    // Atualiza a interface após ataque
    updateCombatUI(opponentStats);
}
