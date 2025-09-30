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

export function updateCombatUI(opponentStats) {
    if (!opponentStats) return;

    // Player
    const playerHealthEl = document.getElementById('player-health');
    const playerKiEl = document.getElementById('player-ki');
    const playerPowerEl = document.getElementById('player-power');

    if (playerHealthEl) playerHealthEl.textContent = playerStats.health;
    if (playerKiEl) playerKiEl.textContent = playerStats.ki;
    if (playerPowerEl) playerPowerEl.textContent = playerStats.power;

    // Opponent
    const opponentHealthEl = document.getElementById('opponent-health');
    const opponentKiEl = document.getElementById('opponent-ki');
    const opponentPowerEl = document.getElementById('opponent-power');

    if (opponentHealthEl) opponentHealthEl.textContent = opponentStats.health;
    if (opponentKiEl) opponentKiEl.textContent = opponentStats.ki;
    if (opponentPowerEl) opponentPowerEl.textContent = opponentStats.power;

    // Log
    const logElement = document.getElementById('combat-log');
    if (logElement) {
        const div = document.createElement('div');
        div.className = 'log-message text-gray-300';
        div.textContent = `📣 Status do inimigo atualizado!`;
        logElement.prepend(div);
    }
}



export function loadPvpCombatScreen(params) {
    matchId = params.matchId;
    currentPlayerId = auth.currentUser.uid;
    matchRef = doc(db, "pvpMatches", matchId);

    onSnapshot(matchRef, snapshot => {
        matchData = snapshot.data();
        if (!matchData) return;

        opponentId = matchData.player1.uid === currentPlayerId ? matchData.player2.uid : matchData.player1.uid;

        const localPlayerStats = matchData.player1.uid === currentPlayerId ? matchData.player1.stats : matchData.player2.stats;
        const opponentStats = matchData.player1.uid === currentPlayerId ? matchData.player2.stats : matchData.player1.stats;

        playerStats.health = localPlayerStats.health;
        playerStats.ki = localPlayerStats.ki;
        playerStats.power = localPlayerStats.power;
        playerStats.defense = localPlayerStats.defense;
        playerStats.upgrades = { ...localPlayerStats.upgrades };

        updateCombatUI(opponentStats);

        if (matchData.status === "finished") {
            alert("Partida finalizada!");
        }
    });
}

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
