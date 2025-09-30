import { auth, db } from './auth.js';
import { doc, getDoc, onSnapshot, updateDoc, Timestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { playerStats, logMessage, loadView } from './main.js';
//val
let currentMatch = null;
let currentPlayerId = null;
let opponentId = null;

export async function loadPvpCombatScreen(params) {
  if (!params?.matchId) {
    logMessage("Match ID não informado.", "text-red-500");
    return;
  }

  currentPlayerId = auth.currentUser?.uid;
  if (!currentPlayerId) {
    logMessage("Usuário não autenticado.", "text-red-500");
    loadView('login');
    return;
  }

  const matchRef = doc(db, "pvpMatches", params.matchId);
  
  onSnapshot(matchRef, async snapshot => {
    if (!snapshot.exists()) {
      logMessage("Partida não encontrada.", "text-red-500");
      loadView('combat-selection');
      return;
    }

    currentMatch = snapshot.data();

    // Identifica o oponente
    if (currentMatch.player1.uid === currentPlayerId) {
      opponentId = currentMatch.player2.uid;
      updateStatsDisplay(currentMatch.player1.stats, currentMatch.player2.stats);
    } else if (currentMatch.player2.uid === currentPlayerId) {
      opponentId = currentMatch.player1.uid;
      updateStatsDisplay(currentMatch.player2.stats, currentMatch.player1.stats);
    } else {
      logMessage("Você não faz parte desta partida.", "text-red-500");
      loadView('combat-selection');
      return;
    }
  });
}

function updateStatsDisplay(playerStatsData, opponentStatsData) {
  const playerHP = document.getElementById('player-health');
  const playerKi = document.getElementById('player-ki');
  const playerPower = document.getElementById('player-power');

  const opponentHP = document.getElementById('opponent-health');
  const opponentKi = document.getElementById('opponent-ki');
  const opponentPower = document.getElementById('opponent-power');

  if(playerHP) playerHP.textContent = playerStatsData.health;
  if(playerKi) playerKi.textContent = playerStatsData.ki;
  if(playerPower) playerPower.textContent = playerStatsData.power;

  if(opponentHP) opponentHP.textContent = opponentStatsData.health;
  if(opponentKi) opponentKi.textContent = opponentStatsData.ki;
  if(opponentPower) opponentPower.textContent = opponentStatsData.power;
}

export async function playerAttack(technique) {
  if (!currentMatch) {
    logMessage("Partida não carregada.", "text-red-500");
    return;
  }

  if (!technique || !technique.name) {
    logMessage("Técnica inválida.", "text-red-500");
    return;
  }

  const matchRef = doc(db, "pvpMatches", currentMatch.id);
  try {
    // Atualizar estado no Firestore (simplificação; lógica real de dano deve ser implementada)
    const newHealth = Math.max(0, currentMatch.player1.stats.health - (technique.power || 5));
    // Determina se o jogador é player1 ou player2 para atualizar o correto
    const isPlayer1 = currentMatch.player1.uid === currentPlayerId;

    const updateField = isPlayer1 ? "player1.stats.health" : "player2.stats.health";

    await updateDoc(matchRef, {
      [updateField]: newHealth,
      updatedAt: new Date()
    });

    logMessage(`Você usou ${technique.name} e causou dano!`);
  } catch (error) {
    logMessage("Falha ao atacar: " + error.message, "text-red-500");
  }
}

// Função chamada externamente ao aceitar convite
export function onMatchAccepted(matchIdFromInvite) {
  logMessage('[PvP] Convite aceito! Abrindo tela de combate...');
  window.passedParams = { matchId: matchIdFromInvite };
  loadPvpCombatScreen(window.passedParams);
}

// Ativa uma partida PvP (chamada pelo challenges.js)
export async function activateMatch(matchIdToActivate) {
  const matchRef = doc(db, "pvpMatches", matchIdToActivate);
  try {
    await updateDoc(matchRef, { status: "active", updatedAt: new Date() });
    logMessage('[PvP] Partida ativada!');
    onMatchAccepted(matchIdToActivate);
  } catch (err) {
    console.error('[PvP] Erro ao ativar partida:', err);
  }
}
