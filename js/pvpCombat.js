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
// val
export function loadPvpCombatScreen(params) {
    matchId = params.matchId;
    currentPlayerId = auth.currentUser.uid;
    matchRef = doc(db, "pvpMatches", matchId);

    console.log('[LOG PvP] Listener do match iniciado para matchId:', matchId);

    onSnapshot(matchRef, snapshot => {
        matchData = snapshot.data();
        if (!matchData) return;

        console.log('[LOG PvP] Snapshot recebido:', matchData);

        opponentId = matchData.player1.uid === currentPlayerId ? matchData.player2.uid : matchData.player1.uid;

        const localPlayerStats = matchData.player1.uid === currentPlayerId ? matchData.player1.stats : matchData.player2.stats;
        const opponentStats = matchData.player1.uid === currentPlayerId ? matchData.player2.stats : matchData.player1.stats;

        // Atualiza stats locais
        playerStats.health = localPlayerStats.health;
        playerStats.ki = localPlayerStats.ki;
        playerStats.power = localPlayerStats.power;
        playerStats.defense = localPlayerStats.defense;
        playerStats.upgrades = { ...localPlayerStats.upgrades };

        // Atualiza UI
        updateCombatUI(opponentStats);

        // Logs detalhados
        if (matchData.status === "accepted") {
            window.logMessage('Oponente aceitou o convite! Combate iniciado.');
        } else if (matchData.status === "finished") {
            window.logMessage('Partida finalizada!');
            alert('Partida finalizada!');
        } else {
            window.logMessage('Aguardando o outro jogador...');
        }
    });
}

export async function playerAttack(selectedTechnique) {
    if (!matchData || matchData.turn !== currentPlayerId) {
        window.logMessage('Não é sua vez!');
        return;
    }

    const opponentStats = matchData.player1.uid === currentPlayerId ? matchData.player2.stats : matchData.player1.stats;
    const damage = (selectedTechnique.power || 10) - (opponentStats.defense || 0);
    opponentStats.health -= Math.max(damage, 0);

    window.logMessage(`Você causou ${Math.max(damage, 0)} de dano com ${selectedTechnique.name}!`);
    updateCombatUI(opponentStats);

    const newTurn = opponentId;

    const update = matchData.player1.uid === currentPlayerId
        ? { "player2.stats": opponentStats, turn: newTurn, updatedAt: new Date() }
        : { "player1.stats": opponentStats, turn: newTurn, updatedAt: new Date() };

    await updateDoc(matchRef, update);
}
