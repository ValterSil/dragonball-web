// atributos.js
import { playerStats, logMessage, updateUI, saveLocalState, updateCalculatedStats, loadView } from './main.js';
import { savePlayerToFirestore } from './playerService.js'; // 🔥 asdasdNovo import
/**
 * Mostra a tela de gerenciamento de atributos.
 * Esta função é chamada quando a view 'atributos' é carregada.
 */
export function showAttributeManagerScreen() {
    if (!playerStats.race) {
        logMessage("Crie um personagem primeiro para gerenciar atributos!", 'text-red-500');
        return;
    }

    renderAttributeManager();
}

/**
 * Renderiza a lista de atributos e os botões de distribuição.
 */
function renderAttributeManager() {
    const attributeListDiv = document.getElementById('attribute-list');
    const pointsDisplay = document.getElementById('attr-remaining-points-display');
    const attrErrorMessage = document.getElementById('attr-error-message');

    if (!attributeListDiv || !pointsDisplay || !attrErrorMessage) {
        console.warn("Elementos da view 'atributos' não encontrados. A view pode não ter sido carregada.");
        return;
    }

    attributeListDiv.innerHTML = '';
    pointsDisplay.textContent = playerStats.attributePoints;

    const attributesInfo = [
        { key: 'strength', name: 'Força (STR)', effect: '+10 Poder por Ponto', color: 'red' },
        { key: 'vitality', name: 'Vigor (VIT)', effect: '+25 HP Máx / +3 Defesa por Ponto', color: 'green' },
        { key: 'ki_control', name: 'Controle de Ki (KI)', effect: '+15 Ki Máx / +3 Poder por Ponto', color: 'blue' },
    ];

    attributesInfo.forEach(attrInfo => {
        const key = attrInfo.key;
        const currentValue = playerStats.attributes[key];
        const hasPoints = playerStats.attributePoints > 0;

        const attrDiv = document.createElement('div');
        attrDiv.className = 'p-3 bg-gray-700 rounded-lg flex justify-between items-center shadow-md';
        attrDiv.innerHTML = `
            <div>
                <div class="font-bold text-lg text-${attrInfo.color}-400">${attrInfo.name}</div>
                <div class="text-xs text-gray-400">${attrInfo.effect}</div>
                <div class="mt-1">
                    <span class="text-2xl font-extrabold text-white" id="attr-value-${key}">${currentValue}</span>
                </div>
            </div>
            <button 
                class="py-2 px-4 rounded-lg font-bold text-lg transition bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-500"
                ${!hasPoints ? 'disabled' : ''}
                onclick="window.increaseAttribute('${key}')" 
            >
                +1 Ponto
            </button>
        `;
        attributeListDiv.appendChild(attrDiv);
    });

    // Atualiza a mensagem de erro
    if (playerStats.attributePoints > 0) {
        attrErrorMessage.classList.add('hidden');
    } else {
        attrErrorMessage.classList.remove('hidden');
    }
}

/**
 * Aumenta um atributo em 1, atualiza stats e salva.
 */
export async function increaseAttribute(key) {
    if (playerStats.attributePoints <= 0) {
        logMessage("❌ Você não tem pontos de atributo para distribuir.", 'text-red-500');
        return;
    }

    playerStats.attributePoints -= 1;
    playerStats.attributes[key] += 1;
    
    updateCalculatedStats(); // Recalcula poder, hp, etc.
    
    logMessage(`Você investiu 1 ponto em ${key.toUpperCase()}. Novo valor: ${playerStats.attributes[key]}`, 'text-indigo-400');
    
    saveLocalState(); // Salva o estado atualizado
    await savePlayerToFirestore(); // 🔥 Agora salva no Firestore também
    
    renderAttributeManager(); // Re-renderiza a lista de atributos
    updateUI(); // Atualiza a UI geral do jogo
}

// Expõe globalmente a função que é chamada diretamente pelo HTML (onclick)
window.increaseAttribute = increaseAttribute; 
