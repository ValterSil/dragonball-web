// mestreKame.js
import { playerStats, logMessage, updateUI, saveLocalState, RACE_DATA, UPGRADE_DATA, calculateXpMultiplier, getTechById, loadView } from './main.js';
import { savePlayerToFirestore } from './playerService.js'; // 🔥 asdasdNovo import

// Elementos da UI do Mestre Kame (precisam existir na view mestreKame.html)
let techniquesListDiv;
let upgradesListDiv;
let tabTechniquesBtn;
let tabUpgradesBtn;

/**
 * Inicializa os elementos DOM da view do Mestre Kame.
 * Deve ser chamado quando a view é carregada.
 */
function initializeMestreKameDOMElements() {
    techniquesListDiv = document.getElementById('techniques-list');
    upgradesListDiv = document.getElementById('upgrades-list');
    tabTechniquesBtn = document.getElementById('tab-techniques');
    tabUpgradesBtn = document.getElementById('tab-upgrades');

    if (tabTechniquesBtn && tabUpgradesBtn) {
        tabTechniquesBtn.onclick = () => showMestreKameMenu('techniques');
        tabUpgradesBtn.onclick = () => showMestreKameMenu('upgrades');
    } else {
        console.warn("Botões de aba do Mestre Kame não encontrados. Verifique mestreKame.html");
    }
}

/**
 * Exibe o menu do Mestre Kame e gerencia as abas (Técnicas/Upgrades).
 * Esta função é chamada quando a view 'mestreKame' é carregada.
 */
export function showMestreKameMenu(tab = 'techniques') { 
    if (!playerStats.race) {
        logMessage("Crie um personagem primeiro para visitar o Mestre Kame!", 'text-red-500');
        return;
    }

    initializeMestreKameDOMElements(); // Garante que os elementos DOM estão atualizados

    // Lógica das abas
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('bg-purple-700', 'hover:bg-purple-800', 'bg-gray-700', 'hover:bg-gray-600'));
    
    if (techniquesListDiv) techniquesListDiv.classList.add('hidden');
    if (upgradesListDiv) upgradesListDiv.classList.add('hidden');

    if (tab === 'techniques') {
        if (tabTechniquesBtn) tabTechniquesBtn.classList.add('bg-purple-700', 'hover:bg-purple-800');
        if (tabUpgradesBtn) tabUpgradesBtn.classList.add('bg-gray-700', 'hover:bg-gray-600');
        if (techniquesListDiv) techniquesListDiv.classList.remove('hidden');
        renderTechniques();
    } else if (tab === 'upgrades') {
        if (tabUpgradesBtn) tabUpgradesBtn.classList.add('bg-purple-700', 'hover:bg-purple-800');
        if (tabTechniquesBtn) tabTechniquesBtn.classList.add('bg-gray-700', 'hover:bg-gray-600');
        if (upgradesListDiv) upgradesListDiv.classList.remove('hidden');
        renderUpgrades();
    }
}
    
/**
 * Renderiza a lista de técnicas que o jogador pode aprender.
 */
function renderTechniques() { 
    if (!techniquesListDiv) {
        console.warn("Elemento 'techniques-list' não encontrado.");
        return;
    }
    techniquesListDiv.innerHTML = '';
    
    const raceTechs = RACE_DATA[playerStats.race]?.techniques; 
    if (!raceTechs || raceTechs.length === 0) {
        techniquesListDiv.innerHTML = '<p class="text-gray-400 text-center">Nenhuma técnica disponível para sua raça.</p>';
        return;
    }

    raceTechs.forEach(tech => {
        const isLearned = playerStats.learnedTechniques.includes(tech.id);
        const canLearn = playerStats.level >= tech.minLevel;
        const statusText = isLearned ? '✅ Aprendida' : (canLearn ? '💰 APRENDER' : `🔒 Nível ${tech.minLevel} Requerido`);
        const statusColor = isLearned ? 'bg-green-700 text-white' : (canLearn ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 text-gray-400 cursor-not-allowed');
        const buttonDisabled = isLearned || !canLearn;
        const kiCost = playerStats.race === 'Andróide' ? 0 : tech.cost;

        const techDiv = document.createElement('div');
        techDiv.className = 'p-3 bg-gray-800 rounded-lg flex justify-between items-center';
        techDiv.innerHTML = `
            <div>
                <div class="font-bold text-lg text-blue-300">${tech.name} <span class="text-xs text-gray-500 italic">(${tech.type})</span></div>
                <div class="text-sm text-gray-400">${tech.description}</div>
                <div class="text-xs mt-1">Custo de KI: <span class="font-mono text-yellow-500">${kiCost}</span> | Nível Exigido: <span class="font-mono text-red-400">${tech.minLevel}</span></div>
            </div>
            <button 
                class="py-2 px-4 rounded-lg font-bold text-sm transition ${statusColor}"
                ${buttonDisabled ? 'disabled' : `onclick="window.learnTechnique('${tech.id}')"`}
            >
                ${statusText}
            </button>
        `;
        techniquesListDiv.appendChild(techDiv);
    });
}

/**
 * Permite ao jogador aprender uma nova técnica.
 */
export async function learnTechnique(techId) { 
    const tech = getTechById(techId); 
    if (!tech) {
        logMessage("❌ Técnica inválida.", 'text-red-500');
        return;
    }
    if (playerStats.level < tech.minLevel) {
        logMessage(`❌ Você precisa ser Nível ${tech.minLevel} para aprender ${tech.name}.`, 'text-red-500');
        return;
    }
    if (playerStats.learnedTechniques.includes(techId)) {
        logMessage(`❌ Você já aprendeu ${tech.name}.`, 'text-red-500');
        return;
    }
    
    playerStats.learnedTechniques.push(techId);
    logMessage(`🎉 Você aprendeu a técnica ${tech.name}!`, 'text-green-500 font-bold');

    saveLocalState(); 

    await savePlayerToFirestore(); // 🔥 Agora salva no Firestore também
    
    updateUI();
    renderTechniques(); // Atualiza a lista de técnicas no menu
}
    
/**
 * Renderiza a lista de upgrades disponíveis para compra com Zeni.
 */
function renderUpgrades() { 
    if (!upgradesListDiv) {
        console.warn("Elemento 'upgrades-list' não encontrado.");
        return;
    }
    upgradesListDiv.innerHTML = '';

    Object.keys(UPGRADE_DATA).forEach(upgradeId => {
        const upgrade = UPGRADE_DATA[upgradeId];
        const currentLevel = playerStats.upgrades[upgradeId] || 0;
        const nextLevel = currentLevel + 1;
        const isMaxLevel = currentLevel >= upgrade.maxLevel;
        const nextCost = isMaxLevel ? 0 : upgrade.cost[currentLevel];
        const canAfford = playerStats.coins >= nextCost;

        const effectDisplay = `+${Math.round(upgrade.effect * 100)}% XP`;
        
        let statusText;
        let buttonClass;
        let buttonDisabled = true;

        if (isMaxLevel) {
            statusText = '✅ Nível Máximo Atingido';
            buttonClass = 'bg-green-700 text-white';
        } else if (canAfford) {
            statusText = `Comprar por ${nextCost} Zeni`;
            buttonClass = 'bg-yellow-600 hover:bg-yellow-700 text-white';
            buttonDisabled = false;
        } else {
            statusText = `Zeni Insuficiente (${nextCost} Zeni)`;
            buttonClass = 'bg-red-500 text-white opacity-70 cursor-not-allowed';
        }

        const upgradeDiv = document.createElement('div');
        upgradeDiv.className = 'p-3 bg-gray-800 rounded-lg flex justify-between items-center';
        upgradeDiv.innerHTML = `
            <div>
                <div class="font-bold text-lg text-purple-300">${upgrade.name} (Nv ${currentLevel}/${upgrade.maxLevel})</div>
                <div class="text-sm text-gray-400">${upgrade.description} (Efeito por Nível: ${effectDisplay})</div>
                <div class="text-xs mt-1 text-yellow-500">Zeni Atual: ${playerStats.coins}</div>
            </div>
            <button 
                class="py-2 px-4 rounded-lg font-bold text-sm transition ${buttonClass}"
                ${buttonDisabled ? 'disabled' : `onclick="window.buyUpgrade('${upgradeId}', ${nextCost})"`}
            >
                ${statusText}
            </button>
        `;
        upgradesListDiv.appendChild(upgradeDiv);
    });
}

/**
 * Compra um upgrade, atualiza Zeni e o efeito do upgrade.
 */
export async function buyUpgrade(upgradeId, cost) { 
    const upgrade = UPGRADE_DATA[upgradeId];
    if (!upgrade) {
        logMessage("❌ Upgrade inválido.", 'text-red-500');
        return;
    }
    
    const currentLevel = playerStats.upgrades[upgradeId] || 0;

    if (currentLevel >= upgrade.maxLevel) {
        logMessage("❌ Não foi possível comprar o upgrade: Nível máximo já atingido.", 'text-red-500');
        return;
    }
    if (playerStats.coins < cost) {
        logMessage(`❌ Você não tem Zeni suficiente para comprar ${upgrade.name}. Precisa de ${cost} Zeni.`, 'text-red-500');
        return;
    }

    playerStats.coins -= cost;
    playerStats.upgrades[upgradeId] = currentLevel + 1;
    
    playerStats.xpMultiplier = calculateXpMultiplier(playerStats); 
    
    const totalBonus = Math.round((playerStats.xpMultiplier - 1.0) * 100);
    logMessage(`✨ Você comprou o nível ${playerStats.upgrades[upgradeId]} de ${upgrade.name}! Bônus XP total agora é +${totalBonus}%!`, 'text-purple-400 font-bold');

    saveLocalState(); 
    
    updateUI();
    renderUpgrades(); // Atualiza a lista de upgrades no menu
}

// Expõe globalmente as funções chamadas pelo HTML (onclick)
window.learnTechnique = learnTechnique;
window.buyUpgrade = buyUpgrade;
// A função showMestreKameMenu já é exposta globalmente no main.js para ser chamada via loadView
