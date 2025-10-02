import { auth, db } from './auth.js';
import {
  doc, getDoc, onSnapshot, updateDoc,
  collection, query, where, arrayUnion, Timestamp
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { playerStats, logMessage, loadView, getTechById, RACE_DATA } from './main.js';

let currentMatch = null;
let currentPlayerId = null;
let opponentPlayerKey = null; // 'player1' ou 'player2'
let localPlayerKey = null; // 'player1' ou 'player2'
let currentMatchUnsubscribe = null; // Para parar de ouvir a partida anterior
let currentLoadedMatchId = null; 

// Listener global que inicia com o jogo
export function listenForActiveMatches() {
  auth.onAuthStateChanged(user => {
    if (!user) return;

    const userId = user.uid;
    const matchesRef = collection(db, 'pvpMatches');
    // Escuta por partidas ativas onde o usuário é player1 OU player2
    const q = query(matchesRef, where('status', '==', 'active'));

    onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === "added" || change.type === "modified") {
            const data = change.doc.data();
            const matchId = change.doc.id;
            
            // Verifica se o usuário atual está na partida
            if (data.player1.uid === userId || data.player2.uid === userId) {
                // Evita recarregar a mesma partida se a view já estiver aberta
                if (window.currentView === 'pvp-combat' && currentLoadedMatchId === matchId) {
                    return;
                }
                currentLoadedMatchId = matchId;
                logMessage(`[PvP] Partida ativa encontrada (${matchId}). Carregando arena...`, 'text-yellow-400');
                loadView('pvp-combat', { matchId });
            }
        }
      });
    });
  });
}

export async function loadPvpCombatScreen(params) {
  if (!params?.matchId) {
    logMessage("ID da partida não informado.", "text-red-500");
    return;
  }
  
  // Para de ouvir a partida anterior para evitar atualizações conflitantes
  if (currentMatchUnsubscribe) {
    currentMatchUnsubscribe();
  }

  currentPlayerId = auth.currentUser?.uid;
  if (!currentPlayerId) {
    logMessage("Usuário não autenticado.", "text-red-500");
    loadView('login');
    return;
  }

  const matchRef = doc(db, "pvpMatches", params.matchId);
  // Inicia um novo listener para a partida atual
  currentMatchUnsubscribe = onSnapshot(matchRef, (snapshot) => {
    if (!snapshot.exists()) {
      logMessage("A partida não foi encontrada ou foi encerrada.", "text-red-500");
      if (currentMatchUnsubscribe) currentMatchUnsubscribe();
      loadView('combat-selection');
      return;
    }

    currentMatch = { id: snapshot.id, ...snapshot.data() };

    // Define quem é o jogador local e o oponente
    if (currentMatch.player1.uid === currentPlayerId) {
      localPlayerKey = 'player1';
      opponentPlayerKey = 'player2';
    } else if (currentMatch.player2.uid === currentPlayerId) {
      localPlayerKey = 'player2';
      opponentPlayerKey = 'player1';
    } else {
      logMessage("Você não faz parte desta partida.", "text-red-500");
      if (currentMatchUnsubscribe) currentMatchUnsubscribe();
      loadView('combat-selection');
      return;
    }

    // Passa os dados do jogador local e do oponente para a UI
    updatePvpCombatUI(currentMatch[localPlayerKey], currentMatch[opponentPlayerKey]);
  });
}

function updatePvpCombatUI(localPlayerData, opponentPlayerData) {
  const safeSetText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  const safeSetWidth = (id, width) => { const el = document.getElementById(id); if (el) el.style.width = width; };
  const safeSetSrc = (id, src) => { const el = document.getElementById(id); if (el) el.src = src; };
  
  // --- Atualiza dados do jogador local ---
  safeSetText('player-combat-name', localPlayerData.name || "Você");
  const localPlayerHealth = localPlayerData.stats.health;
  const localPlayerMaxHealth = localPlayerData.stats.maxHealth || 100;
  safeSetText('player-combat-hp-val', `${Math.floor(localPlayerHealth)}/${localPlayerMaxHealth}`);
  safeSetWidth('player-combat-hp-bar', `${(localPlayerHealth / localPlayerMaxHealth) * 100}%`);
  
  const localPlayerKi = localPlayerData.stats.ki;
  const localPlayerMaxKi = localPlayerData.stats.maxKi || 100;
  safeSetText('player-combat-ki-val', `${Math.floor(localPlayerKi)}/${localPlayerMaxKi}`);
  safeSetWidth('player-combat-ki-bar', `${(localPlayerKi / localPlayerMaxKi) * 100}%`);

  // --- Atualiza dados do oponente ---
  safeSetText('enemy-combat-name', opponentPlayerData.name || "Oponente");
  const opponentHealth = opponentPlayerData.stats.health;
  const opponentMaxHealth = opponentPlayerData.stats.maxHealth || 100;
  safeSetText('enemy-combat-hp-val', `${Math.floor(opponentHealth)}/${opponentMaxHealth}`);
  safeSetWidth('enemy-combat-hp-bar', `${(opponentHealth / opponentMaxHealth) * 100}%`);
  
  const opponentKi = opponentPlayerData.stats.ki;
  const opponentMaxKi = opponentPlayerData.stats.maxKi || 100;
  safeSetText('enemy-combat-ki-val', `${Math.floor(opponentKi)}/${opponentMaxKi}`);
  safeSetWidth('enemy-combat-ki-bar', `${(opponentKi / opponentMaxKi) * 100}%`);

  // --- Lógica de Turno e Ações ---
  const techContainer = document.getElementById('pvp-techniques-list');
  const turnIndicator = document.getElementById('turn-indicator');
  
  const isMyTurn = currentMatch.turn === currentPlayerId;
  
  if (isMyTurn) {
    techContainer.style.display = 'flex';
    turnIndicator.textContent = 'É a sua vez de atacar!';
    renderPlayerTechniques(techContainer, localPlayerKi);
  } else {
    techContainer.innerHTML = ''; // Limpa botões se não for o turno
    techContainer.style.display = 'none';
    turnIndicator.textContent = `Aguardando ação de ${opponentPlayerData.name}...`;
  }
}

// Renderiza as técnicas disponíveis como botões
async function renderPlayerTechniques(container, currentKi) {
    container.innerHTML = '';
    const userDoc = await getDoc(doc(db, "users", currentPlayerId));
    if (!userDoc.exists()) return;
    
    const playerData = userDoc.data();
    const learnedTechniques = playerData.learnedTechniques || [];
    const playerRace = playerData.race;
    
    // Procura as técnicas dentro de RACE_DATA
    const raceTechs = RACE_DATA[playerRace]?.techniques || [];

    learnedTechniques.forEach(techId => {
        const tech = raceTechs.find(t => t.id === techId);
        if (!tech) return;

        const kiCost = playerRace === 'Andróide' ? 0 : tech.cost;
        const canUse = currentKi >= kiCost;

        const btn = document.createElement('button');
        btn.className = `px-3 py-2 rounded text-white font-bold text-sm transition ${canUse ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-500 cursor-not-allowed'}`;
        btn.textContent = `${tech.name} (KI: ${kiCost})`;
        btn.disabled = !canUse;
        btn.onclick = () => playerAttack(tech);
        container.appendChild(btn);
    });
}


// Função de ataque aprimorada
export async function playerAttack(technique) {
  if (!currentMatch || currentMatch.turn !== currentPlayerId) {
    return logMessage("Não é o seu turno para atacar.", "text-red-500");
  }

  const matchRef = doc(db, "pvpMatches", currentMatch.id);
  const attacker = currentMatch[localPlayerKey];
  const defender = currentMatch[opponentPlayerKey];
  const playerRace = (await getDoc(doc(db, "users", attacker.uid))).data().race;
  
  // --- Lógica de Dano Aprimorada ---
  const baseDamage = attacker.stats.power * (technique.powerMult || 1.0);
  const defenseReduction = defender.stats.defense * 0.3; // 30% de redução da defesa
  const finalDamage = Math.max(5, Math.floor(baseDamage - defenseReduction)); // Dano mínimo de 5

  const kiCost = playerRace === 'Andróide' ? 0 : technique.cost;
  if (attacker.stats.ki < kiCost) {
      return logMessage("KI insuficiente!", "text-red-500");
  }
  
  const newKi = attacker.stats.ki - kiCost;
  const newHealth = Math.max(0, defender.stats.health - finalDamage);

  const opponentHealthPath = `${opponentPlayerKey}.stats.health`;
  const localKiPath = `${localPlayerKey}.stats.ki`;
  
  try {
    const logEntry = {
        actor: attacker.name,
        action: `usou ${technique.name} e causou ${finalDamage} de dano!`,
        timestamp: Timestamp.now()
    };

    await updateDoc(matchRef, {
      [opponentHealthPath]: newHealth,
      [localKiPath]: newKi,
      turn: defender.uid, // Passa o turno para o oponente
      updatedAt: new Date(),
      log: arrayUnion(logEntry)
    });
    logMessage(`Você usou ${technique.name} e causou ${finalDamage} de dano!`);
  } catch (error) {
    logMessage("Falha ao atacar: " + error.message, "text-red-500");
  }
}

export async function activateMatch(matchIdToActivate) {
  const matchRef = doc(db, "pvpMatches", matchIdToActivate);
  try {
    await updateDoc(matchRef, { status: "active", updatedAt: new Date() });
    logMessage('[PvP] Partida ativada! Aguarde o redirecionamento...', 'text-green-400');
    // O listener global fará o redirecionamento para ambos os jogadores.
  } catch (err) {
    console.error('[PvP] Erro ao ativar partida:', err);
  }
}
