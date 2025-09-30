// meditation.js
import { 
    playerStats, 
    logMessage, 
    updateUI, 
    saveLocalState, 
    disableActions, 
    updateCalculatedStats, 
    POINTS_PER_LEVEL, 
    XP_TO_LEVEL, 
    combatState 
} from './main.js';

import { savePlayerToFirestore } from './playerService.js'; // 🔥 asdasdNovo import

/**
 * Inicializa a tela de Meditação.
 */
export function initMeditationScreen() {
    // Adiciona o event listener ao botão de meditação após a view ser carregada
    const meditateButton = document.getElementById('meditate-button');
    if (meditateButton) {
        meditateButton.onclick = meditate; // Atrela a função meditate
    } else {
        console.warn("Botão 'meditate-button' não encontrado na view de meditação.");
    }
}

/**
 * Meditação (Treino Passivo): Restaura Ki e ganha XP.
 */
export async function meditate() {
    if (!playerStats.race) {
        logMessage("Crie um personagem primeiro para meditar!", 'text-red-500');
        return;
    }
    if (combatState.isActive) {
        logMessage("Você não pode meditar durante o combate!", 'text-red-500');
        return;
    }
    
    disableActions(true);
    const meditateButton = document.getElementById('meditate-button');
    if (meditateButton) {
        meditateButton.textContent = 'Meditando...';
    }
    
    let baseXpGain = 100; 
    let xpGain = Math.round(baseXpGain * playerStats.xpMultiplier); 

    logMessage("Você meditou, restaurando seu Ki e ganhando um pouco de XP.", 'text-yellow-300');
    
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simula o tempo de treino

    playerStats.health = playerStats.maxHealth; // Recupera HP também
    playerStats.ki = playerStats.maxKi;

    let newXp = playerStats.xp + xpGain; 
    let levelsGained = 0;
    
    while (newXp >= XP_TO_LEVEL) { // Usa while para múltiplos níveis de uma vez
        levelsGained++;
        newXp -= XP_TO_LEVEL;
        playerStats.level++;
        playerStats.attributePoints += POINTS_PER_LEVEL;
    }
    playerStats.xp = newXp;

    updateCalculatedStats(); 
    saveLocalState();

    await savePlayerToFirestore(); // 🔥 Agora salva no Firestore também

    logMessage(`✅ Meditação completa! Você ganhou ${xpGain} XP (Bônus: ${(playerStats.xpMultiplier - 1.0) * 100}%)!`, 'text-green-400');
    if (levelsGained > 0) {
        logMessage(`💥 VOCÊ SUBIU PARA o NÍVEL ${playerStats.level}! Ganhou ${levelsGained * POINTS_PER_LEVEL} Pontos de Atributo!`, 'text-red-500 font-bold');
    }
    updateUI();

    if (meditateButton) {
        meditateButton.textContent = '🧘 Meditar';
    }
    disableActions(false);
}

// Não precisa expor globalmente `window.meditate` se o onclick for adicionado via JS.
// Mas para consistência com o que já foi feito, podemos manter:
window.meditate = meditate;
