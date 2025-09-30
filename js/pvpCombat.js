// pvpCombat.js
import { auth } from './auth.js';
import { doc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
//boo
const db = window.firebaseDb;

let matchId = null;
let matchRef = null;
let currentPlayerId = null;
let opponentId = null;
let matchData = null;

// Inicializa playerStats global se não existir
if (!window.playerStats) {
    window.playerStats = {
        health: 100,
        ki: 50,
        power: 10,
        defense: 5,
        upgrades: {}
    };
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

// Atualiza a UI do combate
export function updateCombatUI(opponentStats) {
    if (!opponentStats) return;

    const { health, ki, power } = window.playerStats;

    const playerHealthEl = document.getElementById('player-health');
    const playerKiEl = document.getElementById('player-ki');
    const playerPowerEl = document.getElementById('player-power');

    const opponentHealthEl = document.getElementById('opponent-health');
    const opponentKiEl = document.getElementById('opponent-ki');
    const opponentPowerEl = document.getElementById('opponent-power');

    if (playerHealthEl) playerHealthEl.textContent = health;
    if (playerKiEl) playerKiEl.textContent = ki;
    if (playerPowerEl) playerPowerEl.textContent = power;

    if (opponentHealthEl) opponentHealthEl.textContent = opponentStats.health;
    if (opponentKiEl) opponentKiEl.textContent = opponentStats.ki;
    if (opponentPowerEl) opponentPowerEl.textContent = opponentStats.power;

    logMessage('[updateCombatUI] UI atualizada');
}

// Carrega a tela PvP
export function loadPvpCombatScreen(params) {
    if (!params || !params.matchId) return;

    matchId = params.matchId;
    currentPlayerId = auth.currentUser.uid;
    matchRef = doc(db, "pvpMatches", matchId);

    const screen = document.getElementById('pvp-combat-screen');
    if (screen) screen.classList.remove('hidden');

    logMessage(`[PvP] Carregando tela PvP para matchId=${matchId}`);

    // Listener único que cobre aceitação e updates do combate
    onSnapshot(matchRef, snapshot => {
        matchData = snapshot.data();
        if (!matchData) return;

        // Determina o oponente
        opponentId = matchData.player1.uid === currentPlayerId
            ? matchData.player2.uid
            : matchData.player1.uid;

        const localPlayerStats = matchData.player1.uid === currentPlayerId
            ? matchData.player1.stats
            : matchData.player2.stats;

        const opponentStats = matchData.player1.uid === currentPlayerId
            ? matchData.player2.stats
            : matchData.player1.stats;

        // Atualiza stats do jogador local
        window.playerStats.health = localPlayerStats.health;
        window.playerStats.ki = localPlayerStats.ki;
        window.playerStats.power = localPlayerStats.power;
        window.playerStats.defense = localPlayerStats.defense;
        window.playerStats.upgrades = { ...localPlayerStats.upgrades };

        updateCombatUI(opponentStats);

        // Verifica status do match
        if (matchData.status === "accepted") {
            logMessage('[PvP] Ambos jogadores prontos. Combate iniciado!');
        }

        if (matchData.status === "finished") {
            logMessage('[PvP] Partida finalizada!');
            alert("Partida finalizada!");
            if (screen) screen.classList.add('hidden');
        }
    });
}

// Ataque do jogador
export async function playerAttack(selectedTechnique) {
    if (!matchData || matchData.turn !== currentPlayerId) {
        logMessage('[PvP] Não é seu turno ainda!');
        return;
    }

    if (matchData.status === "finished") {
        logMessage('[PvP] A partida já acabou!');
        return;
    }

    const opponentStats = matchData.player1.uid === currentPlayerId
        ? matchData.player2.stats
        : matchData.player1.stats;

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

// Função chamada externamente ao aceitar convite
export function onMatchAccepted(matchIdFromInvite) {
    logMessage('[PvP] Convite aceito! Abrindo tela de combate...');
    window.passedParams = { matchId: matchIdFromInvite };
    loadPvpCombatScreen(window.passedParams);
}

// ✅ Função que o challenges.js espera
export function activateMatch(matchIdToActivate) {
    logMessage(`[PvP] Ativando partida ${matchIdToActivate}`);
    const matchRefLocal = doc(db, "pvpMatches", matchIdToActivate);
    updateDoc(matchRefLocal, { status: "active", updatedAt: new Date() })
        .then(() => {
            logMessage('[PvP] Partida ativada!');
            onMatchAccepted(matchIdToActivate);
        })
        .catch(err => console.error('[PvP] Erro ao ativar partida:', err));
}
