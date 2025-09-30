import { auth, db } from './auth.js';
import { doc, getDoc, onSnapshot, updateDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { playerStats, logMessage, loadView } from './main.js';

let currentMatch = null;
let currentPlayerId = null;
let opponentId = null;
//luis
// Carrega e inicializa a tela PvP com os dados da partida
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

// Carrega dados do player e oponente e atualiza UI
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

  // Atualiza dados principais do player global
  Object.assign(playerStats, playerData);

  updateCombatUI(playerData, opponentData);
}

// Atualiza as barras, nomes e imagens da UI
export function updateCombatUI(playerData, opponentData) {
  // jogador
  document.getElementById('player-combat-name').textContent = playerData.characterName || "Você";
  document.getElementById('player-combat-level').textContent = `Nível ${playerData.level || 1}`;
  document.getElementById('player-combat-hp-val').textContent = `${playerData.health || 0}/${playerData.maxHealth || 100}`;
  document.getElementById('player-combat-ki-val').textContent = `${playerData.ki || 0}/${playerData.maxKi || 100}`;

  const playerHpPercent = ((playerData.health || 0) / (playerData.maxHealth || 100)) * 100;
  const playerKiPercent = ((playerData.ki || 0) / (playerData.maxKi || 100)) * 100;

  document.getElementById('player-combat-hp-bar').style.width = `${playerHpPercent}%`;
  document.getElementById('player-combat-ki-bar').style.width = `${playerKiPercent}%`;

  // Se tiver imagem armazenada no playerData, use, senão, usar padrão
  document.getElementById('player-combat-img').src = playerData.avatarUrl || 'imagens/player/goku-player.png';

  // oponente
  document.getElementById('enemy-combat-name').textContent = opponentData.characterName || "Oponente";
  document.getElementById('enemy-combat-level').textContent = `Nível ${opponentData.level || 1}`;
  document.getElementById('enemy-combat-hp-val').textContent = `${opponentData.health || 0}/${opponentData.maxHealth || 100}`;
  document.getElementById('enemy-combat-ki-val').textContent = `${opponentData.ki || 0}/${opponentData.maxKi || 100}`;

  const enemyHpPercent = ((opponentData.health || 0) / (opponentData.maxHealth || 100)) * 100;
  const enemyKiPercent = ((opponentData.ki || 0) / (opponentData.maxKi || 100)) * 100;

  document.getElementById('enemy-combat-hp-bar').style.width = `${enemyHpPercent}%`;
  document.getElementById('enemy-combat-ki-bar').style.width = `${enemyKiPercent}%`;

  document.getElementById('enemy-combat-img').src = opponentData.avatarUrl || 'https://via.placeholder.com/64';
}

// Funcionalidade para atacar
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

  // Simplificação de cálculo de dano - atualizar conforme regras do seu sistema
  const damage = technique.power || 5;

  const newHealthPath = isPlayer1 ? "player2.stats.health" : "player1.stats.health";

  const opponentStats = isPlayer1 ? currentMatch.player2.stats : currentMatch.player1.stats;

  const newHealth = Math.max(0, (opponentStats.health || 100) - damage);

  try {
    await updateDoc(matchRef, {
      [newHealthPath]: newHealth,
      turn: isPlayer1 ? currentMatch.player2.uid : currentMatch.player1.uid,
      updatedAt: new Date()
    });
    logMessage(`Você usou ${technique.name} e causou ${damage} de dano!`);
  } catch (error) {
    logMessage("Falha ao atacar: " + error.message, "text-red-500");
  }
}

// Redireciona ambos jogadores ao ativar a partida PvP
export async function activateMatch(matchIdToActivate) {
  const matchRef = doc(db, "pvpMatches", matchIdToActivate);
  try {
    await updateDoc(matchRef, { status: "active", updatedAt: new Date() });
    logMessage('[PvP] Partida ativada!');

    // Atualiza paths dos jogadores
    const matchDataSnapshot = await getDoc(matchRef);
    if (matchDataSnapshot.exists()) {
      const data = matchDataSnapshot.data();
      // Redireciona para ambos jogadores abrir a tela PvP
      if (auth.currentUser) {
        const uid = auth.currentUser.uid;
        if (uid === data.player1.uid || uid === data.player2.uid) {
          window.passedParams = { matchId: matchIdToActivate };
          loadPvpCombatScreen({ matchId: matchIdToActivate });
          document.getElementById('pvp-combat-screen').classList.remove('hidden');
        }
      }
    }
  } catch (err) {
    console.error('[PvP] Erro ao ativar partida:', err);
  }
}
