// pvpCombat.js
import { auth, db } from './auth.js';
import { doc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { playerStats } from './main.js'; // importa apenas playerStats

let matchId = null;
let matchRef = null;
let currentPlayerId = null;
let opponentId = null;
let matchData = null;

/**
 * Atualiza a UI do oponente no PvP
 */
export function updateCombatUI(opponentStats) {
    // Atualiza HP
    const enemyHpBar = document.getElementById('right-player-hp-bar');
    const enemyHpVal = document.getElementById('right-player-hp-val');
    if (enemyHpBar && enemyHpVal) {
        const hpPercent = (opponentStats.health / opponentStats.maxHealth) * 100;
        enemyHpBar.style.width = `${Math.max(0, hpPercent)}%`;
        enemyHpVal.textContent = `${Math.max(0, Math.floor(opponentStats.health))}/${Math.floor(opponentStats.maxHealth)}`;
    }

    // Atualiza Ki
    const enemyKiBar = document.getElementById('right-player-ki-bar');
    const enemyKiVal = document.getElementById('right-player-ki-val');
    if (enemyKiBar && enemyKiVal) {
        const kiPercent = (opponentStats.ki / opponentStats.maxKi) * 100;
        enemyKiBar.style.width = `${Math.max(0, kiPercent)}%`;
        enemyKiVal.textContent = `${Math.max(0, Math.floor(opponentStats.ki))}/${Math.floor(opponentStats.maxKi)}`;
    }

    // Atualiza nome e poder
    const enemyNameVal = document.getElementById('right-player-name-val');
    const enemyPowerVal = document.getElementById('right-player-power-val');
    if (enemyNameVal) enemyNameVal.textContent = opponentStats.name || '???';
    if (enemyPowerVal) enemyPowerVal.textContent = opponentStats.power;

    // Log opcional
    const logElement = document.getElementById('game-log');
    if (logElement) {
        const div = document.createElement('div');
        div.className = 'log-message text-gray-300';
        div.textContent = `📣 Status do inimigo atualizado!`;
        logElement.prepend(div);
    }
}

/**
 * Inicializa a tela de PvP
 */
export function loadPvpCombatScreen(params) {
    matchId = params.matchId;
    currentPlayerId = auth.currentUser.uid;
    matchRef = doc(db, "pvpMatches", matchId);

    onSnapshot(matchRef, snapshot => {
        matchData = snapshot.data();
        if (!matchData) return;

        // Identifica o oponente
        opponentId = matchData.player1.uid === currentPlayerId ? matchData.player2.uid : matchData.player1.uid;

        // Atualiza stats locais do jogador
        const localPlayerStats = matchData.player1.uid === currentPlayerId ? matchData.player1.stats : matchData.player2.stats;
        const opponentStats = matchData.player1.uid === currentPlayerId ? matchData.player2.stats : matchData.player1.stats;

        playerStats.health = localPlayerStats.health;
        playerStats.ki = localPlayerStats.ki;
        playerStats.power = localPlayerStats.power;
        playerStats.defense = localPlayerStats.defense;
        playerStats.upgrades = { ...localPlayerStats.upgrades };

        // Atualiza UI local do inimigo
        updateCombatUI(opponentStats);

        if (matchData.status === "finished") {
            alert("Partida finalizada!");
        }
    });
}

/**
 * Executa o ataque do jogador
 */
export async function playerAttack(selectedTechnique) {
    if (!matchData || matchData.turn !== currentPlayerId) return;

    const opponentStats = matchData.player1.uid === currentPlayerId ? matchData.player2.stats : matchData.player1.stats;

    // Cálculo simplificado de dano
    const damage = (selectedTechnique.power || 10) - (opponentStats.defense || 0);
    opponentStats.health -= Math.max(damage, 0);

    // Atualiza UI localmente
    updateCombatUI(opponentStats);

    const newTurn = opponentId;

    // Prepara dados para o Firebase
    const update = matchData.player1.uid === currentPlayerId
        ? { "player2.stats": opponentStats, turn: newTurn, updatedAt: new Date() }
        : { "player1.stats": opponentStats, turn: newTurn, updatedAt: new Date() };

    await updateDoc(matchRef, update);

    // Log opcional
    const logElement = document.getElementById('game-log');
    if (logElement) {
        const div = document.createElement('div');
        div.className = 'log-message text-gray-300';
        div.textContent = `Você usou ${selectedTechnique.name} e causou ${Math.max(damage, 0)} de dano!`;
        logElement.prepend(div);
    }
}
