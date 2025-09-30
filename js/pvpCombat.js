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

    const enemyHpBar = document.getElementById('opponent-health-bar');
    const enemyHpVal = document.getElementById('opponent-health-val');
    if (enemyHpBar && enemyHpVal) {
        const hpPercent = (opponentStats.health / opponentStats.maxHealth) * 100;
        enemyHpBar.style.width = `${Math.max(0, hpPercent)}%`;
        enemyHpVal.textContent = `${Math.max(0, Math.floor(opponentStats.health))}/${Math.floor(opponentStats.maxHealth)}`;
    }

    const enemyKiBar = document.getElementById('opponent-ki-bar');
    const enemyKiVal = document.getElementById('opponent-ki-val');
    if (enemyKiBar && enemyKiVal) {
        const kiPercent = (opponentStats.ki / opponentStats.maxKi) * 100;
        enemyKiBar.style.width = `${Math.max(0, kiPercent)}%`;
        enemyKiVal.textContent = `${Math.max(0, Math.floor(opponentStats.ki))}/${Math.floor(opponentStats.maxKi)}`;
    }

    const enemyNameVal = document.getElementById('opponent-name-val');
    const enemyPowerVal = document.getElementById('opponent-power-val');
    if (enemyNameVal) enemyNameVal.textContent = opponentStats.name || '???';
    if (enemyPowerVal) enemyPowerVal.textContent = opponentStats.power;

    const logElement = document.getElementById('combat-log');
    if (logElement) {
        const div = document.createElement('div');
        div.className = 'log-message text-gray-300';
        div.textContent = `📣 Status do inimigo atualizado!`;
        logElement.prepend(div);
    }
}

export function loadPvpCombatScreen(params) {
    console.log("loadPvpCombatScreen chamado", params);
    logMessage("loadPvpCombatScreen chamado com params: " + JSON.stringify(params));

    if (!params.matchId) return;

    matchId = params.matchId;
    currentPlayerId = auth.currentUser.uid;
    matchRef = doc(db, "pvpMatches", matchId);

    logMessage("Você entrou na partida PvP! UID: " + currentPlayerId);

    onSnapshot(matchRef, snapshot => {
        matchData = snapshot.data();
        console.log("Snapshot recebido:", matchData);
        logMessage("Snapshot recebido: " + JSON.stringify(matchData));

        if (!matchData) {
            logMessage("Erro: matchData indefinido!");
            return;
        }

        opponentId = matchData.player1.uid === currentPlayerId ? matchData.player2.uid : matchData.player1.uid;
        logMessage("Oponente identificado: " + opponentId);

        const localPlayerStats = matchData.player1.uid === currentPlayerId ? matchData.player1.stats : matchData.player2.stats;
        const opponentStats = matchData.player1.uid === currentPlayerId ? matchData.player2.stats : matchData.player1.stats;

        Object.assign(playerStats, localPlayerStats);
        logMessage("Stats do jogador local atualizados: " + JSON.stringify(playerStats));

        updateCombatUI(opponentStats);

        if (matchData.player2Accepted && !matchData.started) {
            logMessage("O oponente aceitou o convite! A batalha começou!");
            // Aqui você pode chamar qualquer função de inicialização de UI de combate
        }

        if (matchData.turn === currentPlayerId) {
            logMessage("É a sua vez!");
        } else {
            logMessage("É a vez do oponente!");
        }

        if (matchData.status === "finished") {
            logMessage("A partida terminou!");
            alert("Partida finalizada!");
        }
    });
}

export async function playerAttack(selectedTechnique) {
    if (!matchData || matchData.turn !== currentPlayerId) {
        logMessage("Não é sua vez ainda!");
        return;
    }

    const opponentStats = matchData.player1.uid === currentPlayerId ? matchData.player2.stats : matchData.player1.stats;

    const damage = (selectedTechnique.power || 10) - (opponentStats.defense || 0);
    opponentStats.health -= Math.max(damage, 0);

    updateCombatUI(opponentStats);

    const newTurn = opponentId;

    const update = matchData.player1.uid === currentPlayerId
        ? { "player2.stats": opponentStats, turn: newTurn, updatedAt: new Date() }
        : { "player1.stats": opponentStats, turn: newTurn, updatedAt: new Date() };

    await updateDoc(matchRef, update);

    logMessage(`Você usou ${selectedTechnique.name} e causou ${Math.max(damage, 0)} de dano!`);
}
