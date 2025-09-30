import { playerStats, logMessage, updateUI, saveLocalState, RACE_DATA, updateCalculatedStats, loadView } from './main.js';
import { auth, db } from './auth.js';
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { savePlayerToFirestore } from './playerService.js';



let selectedRace = null;

export function initCharacterCreationScreen() {
    selectedRace = null;
    generateRaceCards();

    const characterNameInput = document.getElementById('character-name-input');
    const createButton = document.getElementById('create-character-button');
    const errorMessage = document.getElementById('creation-error-message');

    if (createButton) createButton.disabled = true;
    if (errorMessage) errorMessage.classList.add('hidden');

    if (characterNameInput) {
        characterNameInput.value = '';
        characterNameInput.oninput = () => {
            if (createButton) {
                createButton.disabled = !selectedRace || characterNameInput.value.trim().length === 0;
            }
        };
    }

    if (createButton) {
        createButton.onclick = async () => {
            const name = characterNameInput.value.trim();
            if (selectedRace && name) {
                await createCharacter(name, selectedRace);
            } else {
                if (errorMessage) {
                    errorMessage.textContent = 'Por favor, digite um nome e escolha uma raça.';
                    errorMessage.classList.remove('hidden');
                }
            }
        };
    }
}

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
        errorMessage.classList.add('hidden');
    }
}

async function createCharacter(name, race) {
    const raceInfo = RACE_DATA[race];
    playerStats.name = name;
    playerStats.race = race;
    playerStats.attributes = { strength: 10, vitality: 10, ki_control: 10 };
    playerStats.attributePoints = 0; 
    playerStats.level = 1;
    playerStats.xp = 0;
    playerStats.coins = 0;
    playerStats.upgrades = { xp_boost: 0 };
    
    updateCalculatedStats(); 
    
    const initialTech = raceInfo.techniques.find(t => t.minLevel === 1);
    playerStats.learnedTechniques = initialTech ? [initialTech.id] : [];
    
    logMessage(`Personagem ${name} da Raça ${race} criado! Poder Inicial: ${playerStats.power}. Defesa: ${playerStats.defense}`, 'text-green-400 font-bold');
    
    playerStats.health = playerStats.maxHealth;
    playerStats.ki = playerStats.maxKi;

// Salva dados no Firestore usando a função centralizada
try {
    await savePlayerToFirestore();
    logMessage('Personagem salvo na conta do usuário!', 'text-green-400 font-bold');
} catch (error) {
    console.error('Erro ao salvar personagem no Firestore:', error);
    logMessage('Erro ao salvar personagem na conta.', 'text-red-500');
}



    saveLocalState();
    updateUI();
    await loadView('status'); 
}

window.selectRace = selectRace;
