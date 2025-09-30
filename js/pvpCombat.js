// pvpCombat.js
import { auth } from './auth.js';
import { doc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { playerStats, onMatchAccepted } from './main.js';

const db = window.firebaseDb;

let matchId = null;
let matchRef = null;
let currentPlayerId = null;
let opponentId = null;
let matchData = null;

// Atualiza a UI do combate
export function updateCombatUI(opponentStats) {
    if (!opponentStats) return;

    const playerHealthEl = document.getElementById('player-health');
    const playerKiEl = document.getElementById('player-ki');
    const playerPowerEl = document.getElementById('player-power');

    const opponentHealthEl = document.getElementById('opponent-health');
    const opponentKiEl = document.getElementById('opponent-ki');
    const opponentPowerEl = document.getElementById('opponent-power');

    if (playerHealthEl) playerHealthEl.textContent = playerStats.health;
    if (playerKiEl) playerKiEl.textContent = playerStats.ki;
    if (playerPowerEl) playerPowerEl.textContent = playerStats.power;

    if (opponentHealthEl) opponentHealthEl.textContent = opponentStats.health;
    if (opponentKiEl) opponentKiEl.textContent = opponentStats.ki;
    if (opponentPowerEl) opponentPowerEl.textContent = opponentStats.power;

    logMessage('[updateCombatUI] UI atualizada');
}

// Função de log para debug
export function logMessage(message) {
    const logDiv = document.getElementById('combat-log');
    if (logDiv) {
        const p = document.createElement('p');
        p.textContent = message;
        logDiv.appendChild(p);
        logDiv.scrollTop = logDiv.scrollHeight;
    }
    console.log('[PvP Log]', message);
}

// Listener de aceitação do match
export function listenMatchAcceptance(matchIdToListen) {
    const matchRefLocal = doc(db, "pvpMatches", matchIdToListen);

    onSnapshot(matchRefLocal, snapshot => {
        const data = snapshot.data();
        if (data && data.status === "accepted") {
            logMessage("✅ O outro jogador aceitou o convite!", "text-green-400");
            onMatchAccepted(matchIdToListen);
        }
    });
}

// Carrega a tela PvP
export function loadPvpCombatScreen(params) {
    if (!params || !params.matchId) return;

    matchId = params.matchId;
    currentPlayerId = auth.currentUser.uid;
    matchRef = doc(db, "pvpMatches", matchId);

    // Mostra a tela PvP
    const screen = document.getElementById('pvp-combat-screen');
    if (screen) screen.classList.remove('hidden');

    logMessage(`[PvP] Carregando tela PvP para matchId=${matchId}`);

    // Inicia listener de aceitação do match
    listenMatchAcceptance(matchId);

    // Ouve mudanças do match
    onSnapshot(matchRef, snapshot => {
        matchData = snapshot.data();
        if (!matchData) return;

        logMessage('[PvP] Snapshot recebido');

        // Determina o oponente
        opponentId = matchData.player1.uid === currentPlayerId ? matchData.player2.uid : matchData.player1.uid;

        const localPlayerStats = matchData.player1.uid === currentPlayerId ? matchData.player1.stats : matchData.player2.stats;
        const opponentStats = matchData.player1.uid === currentPlayerId ? matchData.player2.stats : matchData.player1.stats;

        // Atualiza stats do jogador local
        playerStats.health = localPlayerStats.health;
        playerStats.ki = localPlayerStats.ki;
        playerStats.power = localPlayerStats.power;
        playerStats.defense = localPlayerStats.defense;
        playerStats.upgrades = { ...localPlayerStats.upgrades };

        updateCombatUI(opponentStats);

        // Se a partida acabou
        if (matchData.status === "finished") {
            logMessage('[PvP] Partida finalizada!');
            alert("Partida finalizada!");
        }

        // Se ambos jogadores estão prontos, inicia automaticamente a tela
        if (matchData.status === "accepted" || matchData.turn) {
            logMessage('[PvP] Ambos jogadores prontos, iniciando combate');
            screen.classList.remove('hidden');
        }
    });
}

// Ataque do jogador
export async function playerAttack(selectedTechnique) {
    if (!matchData || matchData.turn !== currentPlayerId) {
        logMessage('[PvP] Não é seu turno ainda!');
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

// Função que dispara a tela PvP ao aceitar convite
export function onMatchAccepted(matchIdFromInvite) {
    console.log(`[PvP] onMatchAccepted chamado com matchId=${matchIdFromInvite}`);
    logMessage('[PvP] Convite aceito! Abrindo tela de combate...');

    // Marca o matchId para a tela PvP
    window.passedParams = { matchId: matchIdFromInvite };

    // Carrega a tela de combate
    loadPvpCombatScreen(window.passedParams);

    console.log('[PvP] loadPvpCombatScreen chamado, aguardando snapshots do match...');
    logMessage('[PvP] Tela de combate carregada, monitorando status do match...');
}

