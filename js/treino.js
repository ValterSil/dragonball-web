// treino.js (Renomeado logicamente para combatSelection, mas o nome do arquivo permanece treino.js)
import { playerStats, logMessage, updateUI, saveLocalState, disableActions, updateCalculatedStats, POINTS_PER_LEVEL, XP_TO_LEVEL, ENEMY_DATA, loadView } from './main.js';


/**
 * Exibe a tela de seleção de inimigos para treino de combate.
 * Esta função é chamada quando a view 'combat-selection' é carregada.
 */
export function showCombatSelectionScreen() {
    if (!playerStats.race) {
        logMessage("Crie um personagem primeiro para treinar!", 'text-red-500');
        return;
    }

    const enemyListDiv = document.getElementById('enemy-selection-list');
    if (!enemyListDiv) {
        console.error("Elemento 'enemy-selection-list' não encontrado. A view de seleção de combate pode não ter sido carregada.");
        return;
    }
    enemyListDiv.innerHTML = '';

    Object.keys(ENEMY_DATA).forEach(enemyName => {
        const enemy = ENEMY_DATA[enemyName];
        const isLocked = playerStats.level < enemy.level;
        const card = document.createElement('div');
        
        card.className = `enemy-card p-4 rounded-lg flex justify-between items-center bg-gray-700 ${isLocked ? 'disabled' : 'hover:bg-gray-600'}`;
        card.innerHTML = `
            <div class="flex items-center">
                <img src="${enemy.img || 'https://via.placeholder.com/40'}" alt="${enemyName}" class="w-10 h-10 rounded-full mr-3">
                <div>
                    <div class="font-bold text-lg text-red-300">${enemy.emoji} ${enemyName}</div>
                    <div class="text-sm text-gray-400">Nível: ${enemy.level} | Dificuldade: <span class="text-yellow-400">${enemy.difficulty}</span></div>
                    <div class="text-xs text-gray-500">Poder: ${enemy.power} | HP: ${enemy.maxHealth} | Recompensa XP: ${Math.round(enemy.xpReward * playerStats.xpMultiplier)}</div>
                </div>
            </div>
            <button 
                class="py-2 px-4 rounded-lg font-bold text-sm transition ${isLocked ? 'bg-gray-500' : 'bg-red-600 hover:bg-red-700'}"
                ${isLocked ? 'disabled' : `onclick="window.startCombat('${enemyName}')"`}
            >
                ${isLocked ? `Bloqueado (Nv ${enemy.level})` : 'ENFRENTAR'}
            </button>
        `;
        enemyListDiv.appendChild(card);
    });
}
