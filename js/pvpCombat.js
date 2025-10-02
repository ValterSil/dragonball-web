import { auth, db } from './auth.js';
import {
  doc, getDoc, onSnapshot, updateDoc,
  collection, query, where, arrayUnion, Timestamp
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { playerStats, logMessage, loadView, RACE_DATA } from './main.js';

let currentMatch = null;
let currentPlayerId = null;
let opponentPlayerKey = null;
let localPlayerKey = null;
let currentMatchUnsubscribe = null;
let currentLoadedMatchId = null; 

export function listenForActiveMatches() {
  auth.onAuthStateChanged(user => {
    if (!user) return;
    const userId = user.uid;
    const matchesRef = collection(db, 'pvpMatches');
    const q = query(matchesRef, where('status', '==', 'active'));

    onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === "added" || change.type === "modified") {
            const data = change.doc.data();
            const matchId = change.doc.id;
            
            if (data.player1.uid === userId || data.player2.uid === userId) {
                if (window.currentView === 'pvp-combat' && currentLoadedMatchId === matchId) {
                    return;
                }
                currentLoadedMatchId = matchId;
                loadView('pvp-combat', { matchId });
            }
        }
      });
    });
  });
}

export async function loadPvpCombatScreen(params) {
  if (!params?.matchId) return;
  if (currentMatchUnsubscribe) currentMatchUnsubscribe();

  currentPlayerId = auth.currentUser?.uid;
  if (!currentPlayerId) {
    loadView('login');
    return;
  }

  const matchRef = doc(db, "pvpMatches", params.matchId);
  currentMatchUnsubscribe = onSnapshot(matchRef, (snapshot) => {
    if (!snapshot.exists() || snapshot.data().status === 'abandoned') {
      logMessage("A partida foi encerrada.", "text-yellow-500");
      if (currentMatchUnsubscribe) currentMatchUnsubscribe();
      loadView('challenges');
      return;
    }

    currentMatch = { id: snapshot.id, ...snapshot.data() };

    if (currentMatch.player1.uid === currentPlayerId) {
      localPlayerKey = 'player1';
      opponentPlayerKey = 'player2';
    } else if (currentMatch.player2.uid === currentPlayerId) {
      localPlayerKey = 'player2';
      opponentPlayerKey = 'player1';
    }
    
    updatePvpCombatUI(currentMatch[localPlayerKey], currentMatch[opponentPlayerKey], currentMatch);
  });
}

function updatePvpCombatUI(local, opponent, match) {
    // Esconde/mostra as áreas corretas
    const arenaArea = document.getElementById('pvp-arena-area');
    const actionArea = document.getElementById('pvp-action-area');
    const resultArea = document.getElementById('pvp-result-area');
    
    if (match.status === 'finished') {
        arenaArea.style.display = 'none';
        actionArea.style.display = 'none';
        resultArea.style.display = 'block';

        const resultMsg = document.getElementById('pvp-result-message');
        if (match.winner === currentPlayerId) {
            resultMsg.textContent = "🏆 VOCÊ VENCEU! 🏆";
            resultMsg.className = "text-2xl font-bold text-green-400";
        } else {
            resultMsg.textContent = "💀 Você foi derrotado... 💀";
            resultMsg.className = "text-2xl font-bold text-red-500";
        }
        return; // Encerra a função aqui
    } else {
        arenaArea.style.display = 'flex';
        actionArea.style.display = 'flex';
        resultArea.style.display = 'none';
    }

  const safeSetText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  const safeSetWidth = (id, width) => { const el = document.getElementById(id); if (el) el.style.width = width; };

  safeSetText('player-combat-name', local.name);
  safeSetText('player-combat-level', `Nível ${local.level || '-'}`);
  safeSetText('player-combat-hp-val', `${Math.floor(local.stats.health)}/${local.stats.maxHealth}`);
  safeSetWidth('player-combat-hp-bar', `${(local.stats.health / local.stats.maxHealth) * 100}%`);
  safeSetText('player-combat-ki-val', `${Math.floor(local.stats.ki)}/${local.stats.maxKi}`);
  safeSetWidth('player-combat-ki-bar', `${(local.stats.ki / local.stats.maxKi) * 100}%`);

  safeSetText('enemy-combat-name', opponent.name);
  safeSetText('enemy-combat-level', `Nível ${opponent.level || '-'}`);
  safeSetText('enemy-combat-hp-val', `${Math.floor(opponent.stats.health)}/${opponent.stats.maxHealth}`);
  safeSetWidth('enemy-combat-hp-bar', `${(opponent.stats.health / opponent.stats.maxHealth) * 100}%`);
  safeSetText('enemy-combat-ki-val', `${Math.floor(opponent.stats.ki)}/${opponent.stats.maxKi}`);
  safeSetWidth('enemy-combat-ki-bar', `${(opponent.stats.ki / opponent.stats.maxKi) * 100}%`);

  const techContainer = document.getElementById('pvp-techniques-list');
  const turnIndicator = document.getElementById('turn-indicator');
  const isMyTurn = match.turn === currentPlayerId;
  
  turnIndicator.textContent = isMyTurn ? 'É a sua vez de atacar!' : `Aguardando ação de ${opponent.name}...`;
  techContainer.innerHTML = '';
  if (isMyTurn) renderPlayerTechniques(techContainer, local.stats.ki);
  
  // Renderiza o Log de Combate
  const logContainer = document.getElementById('pvp-combat-log');
  logContainer.innerHTML = '';
  (match.log || []).forEach(entry => {
      const p = document.createElement('p');
      let message = '';
      if (entry.actorId === currentPlayerId) {
          message = `Você usou ${entry.techName} e causou ${entry.damage} de dano em ${opponent.name}!`;
          p.className = 'text-green-300';
      } else {
          message = `${entry.actorName} usou ${entry.techName} e te causou ${entry.damage} de dano!`;
          p.className = 'text-red-400';
      }
      p.textContent = message;
      logContainer.appendChild(p);
  });
  logContainer.scrollTop = logContainer.scrollHeight;
}

async function renderPlayerTechniques(container, currentKi) {
    const userDoc = await getDoc(doc(db, "users", currentPlayerId));
    if (!userDoc.exists()) return;
    
    const { learnedTechniques = [], race } = userDoc.data();
    const raceTechs = RACE_DATA[race]?.techniques || [];

    learnedTechniques.forEach(techId => {
        const tech = raceTechs.find(t => t.id === techId);
        if (!tech) return;

        const kiCost = race === 'Andróide' ? 0 : tech.cost;
        const canUse = currentKi >= kiCost;

        const btn = document.createElement('button');
        btn.className = `px-3 py-2 rounded text-white font-bold text-sm transition ${canUse ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-500 cursor-not-allowed'}`;
        btn.textContent = `${tech.name} (KI: ${kiCost})`;
        btn.disabled = !canUse;
        btn.onclick = () => playerAttack(tech);
        container.appendChild(btn);
    });
}

export async function playerAttack(technique) {
  if (!currentMatch || currentMatch.turn !== currentPlayerId) return;

  const matchRef = doc(db, "pvpMatches", currentMatch.id);
  const attacker = currentMatch[localPlayerKey];
  const defender = currentMatch[opponentPlayerKey];
  const userDoc = await getDoc(doc(db, "users", attacker.uid));
  const playerRace = userDoc.exists() ? userDoc.data().race : null;

  const baseDamage = attacker.stats.power * (technique.powerMult || 1.0);
  const defenseReduction = defender.stats.defense * 0.3;
  const finalDamage = Math.max(5, Math.floor(baseDamage - defenseReduction));

  const kiCost = playerRace === 'Andróide' ? 0 : technique.cost;
  if (attacker.stats.ki < kiCost) return;
  
  const newKi = attacker.stats.ki - kiCost;
  const newHealth = Math.max(0, defender.stats.health - finalDamage);

  const updates = {};
  updates[`${opponentPlayerKey}.stats.health`] = newHealth;
  updates[`${localPlayerKey}.stats.ki`] = newKi;
  updates.turn = defender.uid;
  updates.updatedAt = new Date();
  updates.log = arrayUnion({
      actorId: attacker.uid,
      actorName: attacker.name,
      techName: technique.name,
      damage: finalDamage,
      timestamp: Timestamp.now()
  });

  // Verifica se o ataque resultou em derrota
  if (newHealth <= 0) {
      updates.status = 'finished';
      updates.winner = attacker.uid;
  }

  await updateDoc(matchRef, updates);
}

export async function leavePvpMatch() {
    if (!currentMatch) return;
    const matchRef = doc(db, "pvpMatches", currentMatch.id);
    await updateDoc(matchRef, {
        status: 'abandoned',
        winner: opponentPlayerKey ? currentMatch[opponentPlayerKey].uid : null // Oponente vence se alguém sair
    });
    // O onSnapshot cuidará do redirecionamento
}

export async function activateMatch(matchIdToActivate) {
  const matchRef = doc(db, "pvpMatches", matchIdToActivate);
  try {
    await updateDoc(matchRef, { status: "active", updatedAt: new Date() });
  } catch (err) {
    console.error('[PvP] Erro ao ativar partida:', err);
  }
}

// Expõe a função para o botão no HTML
window.leavePvpMatch = leavePvpMatch;
