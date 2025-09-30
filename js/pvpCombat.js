import { auth, db } from './auth.js';
import { doc, getDoc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { playerStats, logMessage, loadView } from './main.js';

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
  onSnapshot(matchRef, async (snapshot) => {
    if (!snapshot.exists()) {
      logMessage("Partida não encontrada.", "text-red-500");
      loadView('combat-selection');
      return;
    }

    currentMatch = snapshot.data();

    if (currentMatch.player1.uid === currentPlayerId) {
      opponentId = currentMatch.player2.uid;
      await loadPlayersData(currentMatch.player1.uid, currentMatch.player2.uid);
    } else if (currentMatch.player2.uid === currentPlayerId) {
      opponentId = currentMatch.player1.uid;
      await loadPlayersData(currentMatch.player2.uid, currentMatch.player1.uid);
    } else {
      logMessage("Você não faz parte desta partida.", "text-red-500");
      loadView('combat-selection');
      return;
    }
  });
}

async function loadPlayersData(playerUid, opponentUid) {
  const playerDoc = await getDoc(doc(db, "users", playerUid));
  const opponentDoc = await getDoc(doc(db, "users", opponentUid));

  if (!playerDoc.exists() || !opponentDoc.exists()) {
    logMessage("Dados do jogador e/ou oponente não encontrados.", "text-red-500");
    loadView('combat-selection');
    return;
  }

  const playerData = playerDoc.data();
  const opponentData = opponentDoc.data();

  Object.assign(playerStats, playerData);

  updateCombatUI(playerData, opponentData);
}

export function updateCombatUI(playerData, opponentData) {
  function safeSetText(id, text) {
    const elem = document.getElementById(id);
    if (elem) elem.textContent = text;
  }
  function safeSetWidth(id, width) {
    const elem = document.getElementById(id);
    if (elem) elem.style.width = width;
  }
  function safeSetSrc(id, src) {
    const elem = document.getElementById(id);
    if (elem) elem.src = src;
  }

  safeSetText('player-combat-name', playerData.characterName || "Você");
  safeSetText('player-combat-level', `Nível ${playerData.level || 1}`);

  const playerMaxHealth = playerData.maxHealth || 100;
  const playerHealth = playerData.health || 0;
  safeSetText('player-combat-hp-val', `${playerHealth}/${playerMaxHealth}`);
  safeSetWidth('player-combat-hp-bar', `${(playerHealth / playerMaxHealth) * 100}%`);

  const playerMaxKi = playerData.maxKi || 100;
  const playerKi = playerData.ki || 0;
  safeSetText('player-combat-ki-val', `${playerKi}/${playerMaxKi}`);
  safeSetWidth('player-combat-ki-bar', `${(playerKi / playerMaxKi) * 100}%`);

  safeSetSrc('player-combat-img', playerData.avatarUrl || 'imagens/player/goku-player.png');

  safeSetText('enemy-combat-name', opponentData.characterName || "Oponente");
  safeSetText('enemy-combat-level', `Nível ${opponentData.level || 1}`);

  const opponentMaxHealth = opponentData.maxHealth || 100;
  const opponentHealth = opponentData.health || 0;
  safeSetText('enemy-combat-hp-val', `${opponentHealth}/${opponentMaxHealth}`);
  safeSetWidth('enemy-combat-hp-bar', `${(opponentHealth / opponentMaxHealth) * 100}%`);

  const opponentMaxKi = opponentData.maxKi || 100;
  const opponentKi = opponentData.ki || 0;
  safeSetText('enemy-combat-ki-val', `${opponentKi}/${opponentMaxKi}`);
  safeSetWidth('enemy-combat-ki-bar', `${(opponentKi / opponentMaxKi) * 100}%`);

  safeSetSrc('enemy-combat-img', opponentData.avatarUrl || 'imagens/player/placeholder.png');
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
  const isPlayer1 = currentMatch.player1.uid === currentPlayerId;

  const damage = technique.power || 5;
  const opponentHealthPath = isPlayer1 ? "player2.stats.health" : "player1.stats.health";

  const opponentStats = isPlayer1 ? currentMatch.player2.stats : currentMatch.player1.stats;
  const newHealth = Math.max(0, (opponentStats.health || 100) - damage);

  try {
    await updateDoc(matchRef, {
      [opponentHealthPath]: newHealth,
      turn: isPlayer1 ? currentMatch.player2.uid : currentMatch.player1.uid,
      updatedAt: new Date()
    });
    logMessage(`Você usou ${technique.name} e causou ${damage} de dano!`);
  } catch (error) {
    logMessage("Falha ao atacar: " + error.message, "text-red-500");
  }
}

export async function activateMatch(matchIdToActivate) {
  const matchRef = doc(db, "pvpMatches", matchIdToActivate);
  try {
    await updateDoc(matchRef, { status: "active", updatedAt: new Date() });
    logMessage('[PvP] Partida ativada!');

    if (auth.currentUser) {
      const uid = auth.currentUser.uid;
      const matchDataSnapshot = await getDoc(matchRef);
      if (matchDataSnapshot.exists()) {
        const data = matchDataSnapshot.data();
        if (uid === data.player1.uid || uid === data.player2.uid) {
          window.passedParams = { matchId: matchIdToActivate };
          // Use loadView para carregar a página e depois mostrar a div
          loadView('pvp-combat');
          // Remova o hidden da div após carga completada de view
          document.getElementById('pvp-combat-screen').classList.remove('hidden');
          loadPvpCombatScreen(window.passedParams);
        }
      }
    }
  } catch (err) {
    console.error('[PvP] Erro ao ativar partida:', err);
  }
}
