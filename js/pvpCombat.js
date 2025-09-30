// pvpCombat.js
import { db, auth } from './auth.js';
import { doc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { playerStats, updateCombatUI, logMessage } from './main.js';

let matchId = null;
let matchRef = null;
let currentPlayerId = null;
let opponentId = null;
let matchData = null;

export function loadPvpCombatScreen(params) {
    matchId = params.matchId;
    currentPlayerId = auth.currentUser.uid;

    matchRef = doc(db, "pvpMatches", matchId);

    onSnapshot(matchRef, snapshot => {
        matchData = snapshot.data();
        if (!matchData) return;

        // define quem é o oponente
        opponentId = matchData.player1.uid === currentPlayerId ? matchData.player2.uid : matchData.player1.uid;

        // atualiza stats locais
        const localPlayerStats = matchData.player1.uid === currentPlayerId ? matchData.player1.stats : matchData.player2.stats;
        const opponentStats = matchData.player1.uid === currentPlayerId ? matchData.player2.stats : matchData.player1.stats;

        playerStats.health = localPlayerStats.health;
        playerStats.ki = localPlayerStats.ki;
        playerStats.power = localPlayerStats.power;
        playerStats.defense = localPlayerStats.defense;
        playerStats.level = localPlayerStats.level;
        playerStats.coins = localPlayerStats.zeni;

        updateCombatUI(opponentStats);

        // verifica fim de combate
        if (localPlayerStats.health <= 0 || opponentStats.health <= 0) {
            alert("Partida finalizada!");
            updateDoc(matchRef, { status: "finished" });
        }
    });
}

// Função chamada ao atacar
export async function playerAttack(selectedTechnique) {
    if (matchData.turn !== currentPlayerId) return;

    const isPlayer1 = matchData.player1.uid === currentPlayerId;
    const opponentStats = isPlayer1 ? matchData.player2.stats : matchData.player1.stats;

    const damage = calculateDamage(selectedTechnique, opponentStats);
    opponentStats.health -= damage;

    const newTurn = opponentId;

    const update = isPlayer1
        ? { "player2.stats": opponentStats, turn: newTurn, updatedAt: new Date() }
        : { "player1.stats": opponentStats, turn: newTurn, updatedAt: new Date() };

    await updateDoc(matchRef, update);
}

// Função de cálculo de dano (exemplo simples)
function calculateDamage(technique, opponentStats) {
    // Aqui você pode criar lógica baseada em ki, poder, defesa, upgrades, etc
    return Math.floor(playerStats.power * 0.3);
}
