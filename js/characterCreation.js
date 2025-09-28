// characterCreation.js
import { playerStats, logMessage, updateUI, saveLocalState, RACE_DATA, updateCalculatedStats, loadView } from './main.js';

let selectedRace = null; // Variável para controlar a raça selecionada nesta tela

/**
 * Inicializa a tela de criação de personagem.
 */
export function initCharacterCreationScreen() {
    selectedRace = null; // Reseta a seleção de raça
    generateRaceCards(); // Gera os cards de raça

    const characterNameInput = document.getElementById('character-name-input');
    const createButton = document.getElementById('create-character-button');
    const errorMessage = document.getElementById('creation-error-message');

    // Estado inicial do botão
    if (createButton) {
        createButton.disabled = true; // Começa desabilitado
    }
    if (errorMessage) {
        errorMessage.classList.add('hidden'); // Esconde erros
    }

    if (characterNameInput) {
        characterNameInput.value = ''; // Limpa o campo de nome
        characterNameInput.oninput = () => {
            if (createButton) {
                createButton.disabled = !selectedRace || characterNameInput.value.trim().length === 0;
            }
        };
    }

    if (createButton) {
        createButton.onclick = () => {
            const name = characterNameInput.value.trim();
            if (selectedRace && name) { 
                createCharacter(name, selectedRace); 
            } else {
                if (errorMessage) {
                    errorMessage.textContent = 'Por favor, digite um nome e escolha uma raça.';
                    errorMessage.classList.remove('hidden');
                }
            }
        };
    }
}

/**
 * Gera os cards de raça na tela de criação de personagem.
 */
function generateRaceCards() { 
    const raceSelectionDiv = document.getElementById('race-selection');
    if (!raceSelectionDiv) return; 
    raceSelectionDiv.innerHTML = '';

    Object.keys(RACE_DATA).forEach(raceKey => {
        const race = RACE_DATA[raceKey];
        const card = document.createElement('div');
        card.className = 'race-card p-2 rounded-lg bg-gray-800 text-center flex flex-col items-center justify-center';
        card.setAttribute('data-race', raceKey);
        card.innerHTML = `
            <div class="text-3xl mb-1">${race.emoji}</div>
            <div class="font-bold text-sm">${raceKey}</div>
            <div class="text-xs text-gray-400 mt-1">${race.bonus}</div>
        `;
        card.addEventListener('click', () => selectRace(raceKey, card));
        raceSelectionDiv.appendChild(card);
    });
}

/**
 * Seleciona uma raça e atualiza a UI.
 */
function selectRace(raceKey, cardElement) {
    document.querySelectorAll('.race-card').forEach(card => card.classList.remove('selected'));
    cardElement.classList.add('selected');
    selectedRace = raceKey; 
    const createButton = document.getElementById('create-character-button');
    const nameInput = document.getElementById('character-name-input');
    if (createButton && nameInput) {
        createButton.disabled = !selectedRace || nameInput.value.trim().length === 0;
    }
    const errorMessage = document.getElementById('creation-error-message');
    if (errorMessage) {
        errorMessage.classList.add('hidden'); // Esconde erro ao selecionar raça
    }
}

/**
 * Cria o personagem, salva no localStorage e exibe a área de ações.
 */
function createCharacter(name, race) {
    const raceInfo = RACE_DATA[race];
    playerStats.name = name;
    playerStats.race = race;
    playerStats.attributes = { strength: 10, vitality: 10, ki_control: 10 }; // Atributos base
    playerStats.attributePoints = 0; 
    playerStats.level = 1;
    playerStats.xp = 0;
    playerStats.coins = 0;
    playerStats.upgrades = { xp_boost: 0 };
    
    updateCalculatedStats(); 
    
    const initialTech = raceInfo.techniques.find(t => t.minLevel === 1);
    if (initialTech) playerStats.learnedTechniques = [initialTech.id];
    else playerStats.learnedTechniques = []; // Garante que é um array, mesmo sem técnicas iniciais

    logMessage(`Personagem ${name} da Raça ${race} criado! Poder Inicial: ${playerStats.power}. Defesa: ${playerStats.defense}`, 'text-green-400 font-bold');
    
    // Define health e ki para o máximo após a criação
    playerStats.health = playerStats.maxHealth;
    playerStats.ki = playerStats.maxKi;

    saveLocalState();
    updateUI();
    loadView('status'); // Volta para a tela de status/ação
}

// Expõe a função `selectRace` globalmente para ser usada nos onclick dos cards de raça
window.selectRace = selectRace;