// combate.js
import { CombatSystem } from './combatSystem.js';
import { playerStats, logMessage, updateUI, saveLocalState, combatState, ENEMY_DATA, XP_TO_LEVEL, POINTS_PER_LEVEL, updateCalculatedStats, getTechById, loadView } from './main.js';

// Elemento do log de movimentos de combate (será inicializado uma vez)
let combatMovesLogElement = null;
let combatSystem = null;

// --- FUNÇÕES DE COMBATE ---

function addCombatMoveLog(message, className = 'text-gray-300') {
    if (!combatMovesLogElement) {
        combatMovesLogElement = document.getElementById('combat-log-moves');
        if (!combatMovesLogElement) {
            console.error("[addCombatMoveLog] Elemento 'combat-log-moves' NÃO encontrado no DOM! Log de combate falhou.");
            return;
        }
        if (combatMovesLogElement.innerHTML.includes('Nenhum movimento registrado ainda...')) {
            combatMovesLogElement.innerHTML = ''; 
        }
    }

    const div = document.createElement('div');
    div.className = `log-message ${className}`;
    div.textContent = `[${new Date().toLocaleTimeString().substring(0, 5)}] ${message}`;
    combatMovesLogElement.prepend(div);

    while (combatMovesLogElement.children.length > 10) {
        combatMovesLogElement.removeChild(combatMovesLogElement.lastChild);
    }
}

function handleCombatLogUpdate(event) {
    const { message, type } = event.detail;
    const typeClasses = {
        'player-action': 'text-green-300',
        'enemy-action': 'text-red-400',
        'damage': 'text-red-300',
        'heal': 'text-blue-400',
        'buff': 'text-purple-400',
        'critical': 'text-yellow-400 font-bold',
        'dodge': 'text-gray-400',
        'error': 'text-red-500',
        'info': 'text-gray-300',
        'self-damage': 'text-orange-400',
        'buff-end': 'text-gray-400',
        'absorb': 'text-green-400'
    };
    
    addCombatMoveLog(message, typeClasses[type] || 'text-gray-300');
    
    if (type !== 'info' && type !== 'buff-end') {
        logMessage(message, typeClasses[type] || 'text-gray-300');
    }
}

async function handleBattleEnded(event) {
    const { result, player, enemy } = event.detail;
    Object.assign(playerStats, {
        health: player.health,
        ki: player.ki,
        activeBuffs: player.activeBuffs,
        activeTransformations: player.activeTransformations
    });
    await endCombat(result, enemy);
}

export async function startCombat(enemyName) {
    console.log(`[combate.js] startCombat() chamado para: ${enemyName}`);

    playerStats.health = playerStats.maxHealth;
    playerStats.ki = playerStats.maxKi;

const enemyCard = document.querySelector('.enemy-info');
const playerCard = document.querySelector('.player-info');

const enemyCrown = enemyCard ? enemyCard.querySelector('.winner-crown') : null;
const playerCrown = playerCard ? playerCard.querySelector('.winner-crown') : null;

if (enemyCard) enemyCard.classList.remove('card-derrotado');
if (playerCard) playerCard.classList.remove('card-derrotado');

if (enemyCrown) enemyCrown.classList.add('hidden');
if (playerCrown) playerCrown.classList.add('hidden');


    if (!playerStats.race) {
        logMessage("Crie um personagem primeiro para combater!", 'text-red-500');
        return;
    }
    
    const combatPlayer = {
        name: playerStats.name,
        race: playerStats.race,
        level: playerStats.level,
        basePower: playerStats.power,
        currentPower: playerStats.power,
        health: playerStats.maxHealth,
        maxHealth: playerStats.maxHealth,
        ki: playerStats.maxKi,
        maxKi: playerStats.maxKi,
        defense: playerStats.defense,
        speed: playerStats.speed,
        activeBuffs: [...playerStats.activeBuffs],
        activeTransformations: [...playerStats.activeTransformations],
        learnedTechniques: [...playerStats.learnedTechniques]
    };

    const enemyData = ENEMY_DATA[enemyName];
    const combatEnemy = {
        name: enemyName,
        ...enemyData,
        health: enemyData.maxHealth,
        maxHealth: enemyData.maxHealth,
        ki: enemyData.maxKi || 100,
        maxKi: enemyData.maxKi || 100,
        basePower: enemyData.power,
        currentPower: enemyData.power,
        activeBuffs: [],
        activeTransformations: []
    };

    combatSystem = new CombatSystem(combatPlayer, combatEnemy);

    document.addEventListener('combatLogUpdate', handleCombatLogUpdate);
    document.addEventListener('battleEnded', handleBattleEnded);

    // Ocultar visual vitória/derrota e botão retorno
    const enemyResultElement = document.getElementById('enemy-battle-result');
    const playerResultElement = document.getElementById('player-battle-result');
    const returnButton = document.getElementById('end-combat-return-button');
    if (enemyResultElement && playerResultElement && returnButton) {
        enemyResultElement.classList.add('hidden');
        playerResultElement.classList.add('hidden');
        returnButton.classList.add('hidden');
    }

    combatState.enemyName = enemyName;
    combatState.enemy = enemyData;
    combatState.currentEnemyHealth = combatEnemy.health;
    combatState.currentEnemyMaxHealth = combatEnemy.maxHealth;
    combatState.isActive = true;
    combatState.showBattleResult = false; // Reset flag

    logMessage(`Você iniciou um treinamento contra ${enemyData.emoji} ${enemyName}! Que comece a batalha!`, 'text-red-400 font-bold');
    
    await loadView('arena');

    logMessage(`Você iniciou um treinamento contra ${enemyData.emoji} ${enemyName}! Que comece a batalha!`, 'text-red-400 font-bold');
    addCombatMoveLog(`Início do combate contra ${enemyData.emoji} ${enemyName}!`, 'text-yellow-400');

    await new Promise(resolve => setTimeout(resolve, 500));

    await combatSystem.enemyTurn();
    if (combatSystem.player) {
        playerStats.health = combatSystem.player.health;
        playerStats.ki = combatSystem.player.ki;
        playerStats.activeBuffs = [...combatSystem.player.activeBuffs];
        playerStats.activeTransformations = [...combatSystem.player.activeTransformations];
    }
    updateCombatUI();
    updateUI();
}

export async function handleCombatTurn() { 
    console.log("[combate.js] handleCombatTurn() chamado.");
    
    if (!combatSystem || !combatState.isActive) {
        console.warn("[combate.js] handleCombatTurn(): Combate não ativo ou sistema não inicializado.");
        return;
    }

    if (combatSystem.isTurnInProgress) {
        console.warn("[combate.js] handleCombatTurn(): Turno já em progresso, ignorando clique duplo.");
        return;
    }

    const localCombatSystem = combatSystem;

    if (!localCombatSystem.player) {
        console.warn("[combate.js] handleCombatTurn(): CombatSystem.player não definido.");
        return;
    }

    const techniqueSelect = document.getElementById('player-technique-select');
    if (!techniqueSelect || !techniqueSelect.value) {
        logMessage("Selecione uma técnica para atacar.", 'text-red-500');
        return;
    }

    const techId = techniqueSelect.value;
    const playerTech = getTechById(techId);
    
    if (!playerTech) {
        logMessage("Técnica inválida.", 'text-red-500');
        return;
    }

    const attackButton = document.getElementById('combat-attack-button');
    if (attackButton) attackButton.disabled = true;

    try {
        await localCombatSystem.executeTurn({
            technique: playerTech,
            target: localCombatSystem.enemy
        });

        if (localCombatSystem.player) {
            playerStats.health = localCombatSystem.player.health;
            playerStats.ki = localCombatSystem.player.ki;
            playerStats.activeBuffs = [...localCombatSystem.player.activeBuffs];
            playerStats.activeTransformations = [...localCombatSystem.player.activeTransformations];
            
            if (localCombatSystem.enemy) {
                combatState.currentEnemyHealth = localCombatSystem.enemy.health;
            }
        }

    } catch (error) {
        console.error("Erro durante o turno de combate:", error);
        logMessage("Erro durante o combate!", 'text-red-500');
    } finally {
        if (combatState.isActive && attackButton) {
            attackButton.disabled = false;
        }
    }

    updateCombatUI();
    updateUI();
}

export async function endCombat(reason, enemy = null) { 
    console.log(`[combate.js] endCombat() chamado. Razão: ${reason}`);
    
    document.removeEventListener('combatLogUpdate', handleCombatLogUpdate);
    document.removeEventListener('battleEnded', handleBattleEnded);

    combatState.isActive = false;
    combatState.showBattleResult = true; // Indica para UI mostrar resultado

    const enemyName = combatState.enemyName;
    const enemyData = enemy || combatState.enemy;

    const attackButton = document.getElementById('combat-attack-button');
    if (attackButton) attackButton.disabled = true;

    const enemyResultElement = document.getElementById('enemy-battle-result');
    const playerResultElement = document.getElementById('player-battle-result');
    const returnButton = document.getElementById('end-combat-return-button');

    if (enemyResultElement && playerResultElement && returnButton) {
        enemyResultElement.classList.remove('hidden');
        playerResultElement.classList.remove('hidden');
        returnButton.classList.remove('hidden');

        if (reason === 'victory') {
            enemyResultElement.textContent = 'DERROTADO';
            playerResultElement.textContent = 'VENCEDOR';
            enemyResultElement.classList.remove('text-green-500');
            enemyResultElement.classList.add('text-red-600', 'font-bold');
            playerResultElement.classList.remove('text-red-600');
            playerResultElement.classList.add('text-green-500', 'font-bold');
        } else if (reason === 'defeat') {
            enemyResultElement.textContent = 'VENCEDOR';
            playerResultElement.textContent = 'DERROTADO';
            enemyResultElement.classList.remove('text-red-600');
            enemyResultElement.classList.add('text-green-500', 'font-bold');
            playerResultElement.classList.remove('text-green-500');
            playerResultElement.classList.add('text-red-600', 'font-bold');
        } else {
            enemyResultElement.textContent = '';
            playerResultElement.textContent = '';
            enemyResultElement.classList.add('hidden');
            playerResultElement.classList.add('hidden');
            returnButton.classList.add('hidden');
        }
    }

    const enemyCard = document.querySelector('.enemy-info');
    const playerCard = document.querySelector('.player-info');

    const enemyCrown = enemyCard ? enemyCard.querySelector('.winner-crown') : null;
    const playerCrown = playerCard ? playerCard.querySelector('.winner-crown') : null;

    if (reason === 'victory') {
        if (enemyCard) enemyCard.classList.add('card-derrotado');  // Foto, nome, status em PB no perdedor (inimigo)
        if (playerCard) playerCard.classList.remove('card-derrotado'); // Vencedor colorido

        if (enemyCrown) enemyCrown.classList.add('hidden');
        if (playerCrown) playerCrown.classList.remove('hidden');
    } else if (reason === 'defeat') {
        if (enemyCard) enemyCard.classList.remove('card-derrotado'); // Vencedor colorido
        if (playerCard) playerCard.classList.add('card-derrotado'); // Foto, nome, status em PB no perdedor (player)

        if (enemyCrown) enemyCrown.classList.remove('hidden');
        if (playerCrown) playerCrown.classList.add('hidden');
    } else {
        if (enemyCard) enemyCard.classList.remove('card-derrotado');
        if (playerCard) playerCard.classList.remove('card-derrotado');

        if (enemyCrown) enemyCrown.classList.add('hidden');
        if (playerCrown) playerCrown.classList.add('hidden');
    }





    if (reason === 'victory') {
        const baseXpGain = enemyData.xpReward; 
        const xpGain = Math.round(baseXpGain * playerStats.xpMultiplier); 
        const zeniGain = enemyData.zeniReward;
        
        logMessage(`🏆 VITÓRIA! Você derrotou ${enemyData.emoji} ${enemyName}!`, 'text-yellow-500 font-bold text-lg');
        logMessage(`Você recebeu ${xpGain} XP (Bônus: ${(playerStats.xpMultiplier - 1.0) * 100}%) e ${zeniGain} Zeni.`, 'text-green-400');
        addCombatMoveLog(`🏆 VITÓRIA! Você derrotou ${enemyName}! Ganhou ${xpGain} XP e ${zeniGain} Zeni.`, 'text-yellow-500');

        playerStats.xp += xpGain; 
        playerStats.coins += zeniGain;

        let levelsGained = 0;
        while (playerStats.xp >= XP_TO_LEVEL) {
            levelsGained++;
            playerStats.xp -= XP_TO_LEVEL;
            playerStats.level++;
            playerStats.attributePoints += POINTS_PER_LEVEL; 
        }

        if (levelsGained > 0) {
             logMessage(`💥 VOCÊ SUBIU PARA o NÍVEL ${playerStats.level}! Ganhou ${levelsGained * POINTS_PER_LEVEL} Pontos de Atributo!`, 'text-red-500 font-bold');
             addCombatMoveLog(`💥 VOCÊ SUBIU PARA O NÍVEL ${playerStats.level}!`, 'text-red-500');
        }
        updateCalculatedStats(); 
        
    } else if (reason === 'defeat') { 
        logMessage(`💀 DERROTA! Você foi nocauteado por ${enemyData.emoji} ${enemyName}!`, 'text-red-600 font-bold text-lg');
        logMessage('Você retorna para a área de ação para se recuperar.', 'text-gray-400');
        addCombatMoveLog(`💀 DERROTA! Você foi nocauteado por ${enemyName}.`, 'text-red-600');
    } else if (reason === 'flee') {
        logMessage(`💨 RETIRADA! Você fugiu do combate contra ${enemyData.emoji} ${enemyName}.`, 'text-yellow-500');
        addCombatMoveLog(`💨 RETIRADA! Você fugiu do combate contra ${enemyData.emoji} ${enemyName}.`, 'text-yellow-500');
    } else {
        logMessage(`O treinamento contra ${enemyData.emoji} ${enemyName} terminou.`, 'text-gray-400');
        addCombatMoveLog(`O treinamento contra ${enemyData.emoji} ${enemyName} terminou.`, 'text-gray-400');
    }
    
    playerStats.health = playerStats.maxHealth;
    playerStats.ki = playerStats.maxKi;
    playerStats.activeBuffs = [];
    updateCalculatedStats(); 

    saveLocalState();

    // Não limpa o combate ainda para mostrar resultado
    // A limpeza será feita após a pausa

    cleanupCombatLog();

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Limpa valores para o próximo combate e troca de tela
    combatState.enemy = null;
    combatState.enemyName = null;
    combatState.showBattleResult = false;
    combatSystem = null;

    loadView('combat-selection');
    updateUI();
}

/**
 * Limpa o log de combate
 */
function cleanupCombatLog() {
    const currentCombatMovesLog = document.getElementById('combat-log-moves');
    if (currentCombatMovesLog) {
        currentCombatMovesLog.innerHTML = '<p>Nenhum movimento registrado ainda...</p>';
    }
    combatMovesLogElement = null;
}

/**
 * Atualiza a interface da Arena de Combate com os stats atuais.
 */
export function updateCombatUI() { 
    console.log("[combate.js] updateCombatUI() chamado.");
    
    const arenaContainer = document.getElementById('combat-arena-view');
    if (!arenaContainer) {
        console.error("updateCombatUI: Elemento 'combat-arena-view' NÃO encontrado no DOM!");
        return;
    }

    if ((!combatState.isActive && !combatState.showBattleResult) || !combatState.enemy) {
        console.warn("updateCombatUI: Combat NÃO está ativo ou inimigo NÃO está definido. Carregando placeholder.");
        arenaContainer.innerHTML = `
            <h3 class="view-title">Área de Treino</h3>
            <p class="text-center text-gray-400 mt-8">Nenhum combate ativo. Selecione um inimigo para treinar.</p>
            <button class="back-button mt-4" onclick="window.loadView('combat-selection')">← Voltar para Seleção</button>
        `;
        return;
    }
    
    const enemy = combatState.enemy;
    const enemyName = combatState.enemyName;
    
    // PLAYER STATS
    const playerHpPercent = (playerStats.health / playerStats.maxHealth) * 100;
    const playerCombatNameElement = document.getElementById('player-combat-name');
    if (playerCombatNameElement) playerCombatNameElement.textContent = playerStats.name;
    const playerCombatLevelElement = document.getElementById('player-combat-level');
    if (playerCombatLevelElement) playerCombatLevelElement.textContent = `Nível ${playerStats.level}`;
    const playerCombatHpValElement = document.getElementById('player-combat-hp-val');
    if (playerCombatHpValElement) playerCombatHpValElement.textContent = `${Math.max(0, Math.floor(playerStats.health))}/${Math.floor(playerStats.maxHealth)}`;
    const playerCombatHpBarElement = document.getElementById('player-combat-hp-bar');
    if (playerCombatHpBarElement) playerCombatHpBarElement.style.width = `${Math.max(0, playerHpPercent)}%`;
    
    const playerKiPercent = (playerStats.ki / playerStats.maxKi) * 100;
    const playerCombatKiValElement = document.getElementById('player-combat-ki-val');
    if (playerCombatKiValElement) playerCombatKiValElement.textContent = `${Math.max(0, Math.floor(playerStats.ki))}/${Math.floor(playerStats.maxKi)}`;
    const playerCombatKiBarElement = document.getElementById('player-combat-ki-bar');
    if (playerCombatKiBarElement) playerCombatKiBarElement.style.width = `${Math.max(0, playerKiPercent)}%`;

    // ENEMY STATS
    const enemyHpPercent = (combatState.currentEnemyHealth / combatState.currentEnemyMaxHealth) * 100;
    const enemyCombatImgElement = document.getElementById('enemy-combat-img');
    if (enemyCombatImgElement) enemyCombatImgElement.src = enemy.img || 'https://via.placeholder.com/64';
    const enemyCombatNameElement = document.getElementById('enemy-combat-name');
    if (enemyCombatNameElement) enemyCombatNameElement.textContent = enemyName;
    const enemyCombatLevelElement = document.getElementById('enemy-combat-level');
    if (enemyCombatLevelElement) enemyCombatLevelElement.textContent = `Nível ${enemy.level}`;
    const enemyCombatHpValElement = document.getElementById('enemy-combat-hp-val');
    if (enemyCombatHpValElement) enemyCombatHpValElement.textContent = `${Math.max(0, Math.floor(combatState.currentEnemyHealth))}/${Math.floor(combatState.currentEnemyMaxHealth)}`;
    const enemyCombatHpBarElement = document.getElementById('enemy-combat-hp-bar');
    if (enemyCombatHpBarElement) enemyCombatHpBarElement.style.width = `${Math.max(0, enemyHpPercent)}%`;

    const enemyKiPercent = combatSystem && combatSystem.enemy ? (combatSystem.enemy.ki / combatSystem.enemy.maxKi) * 100 : 0;
    const enemyCombatKiValElement = document.getElementById('enemy-combat-ki-val');
    if (enemyCombatKiValElement) {
        enemyCombatKiValElement.textContent = `${Math.max(0, Math.floor(combatSystem.enemy.ki))}/${Math.floor(combatSystem.enemy.maxKi)}`;
    }
    const enemyCombatKiBarElement = document.getElementById('enemy-combat-ki-bar');
    if (enemyCombatKiBarElement) {
        enemyCombatKiBarElement.style.width = `${Math.max(0, enemyKiPercent)}%`;
    }

    // Mostrar resultado de combate na UI (VENCEDOR / DERROTADO)
    const enemyResultElement = document.getElementById('enemy-battle-result');
    const playerResultElement = document.getElementById('player-battle-result');
    if (enemyResultElement && playerResultElement) {
        if (combatState.showBattleResult) {
            enemyResultElement.classList.remove('hidden');
            playerResultElement.classList.remove('hidden');
        } else {
            enemyResultElement.classList.add('hidden');
            playerResultElement.classList.add('hidden');
        }
    }

    // TECHNIQUES DROPDOWN
    const techniqueSelect = document.getElementById('player-technique-select');
    if (techniqueSelect) {
        if (techniqueSelect.options.length <= 1 || techniqueSelect.dataset.lastCombatEnemy !== enemyName) { 
            techniqueSelect.innerHTML = '';
            if (playerStats.learnedTechniques.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'Nenhuma técnica aprendida';
                option.disabled = true;
                option.selected = true;
                techniqueSelect.appendChild(option);
                const combatAttackButton = document.getElementById('combat-attack-button');
                if (combatAttackButton) combatAttackButton.disabled = true;
            } else {
                playerStats.learnedTechniques.forEach(techId => {
                    const tech = getTechById(techId); 
                    if (!tech) return;
                    const kiCost = playerStats.race === 'Andróide' ? 0 : tech.cost;
                    const option = document.createElement('option');
                    option.value = tech.id;
                    option.textContent = `${tech.name} (KI: ${kiCost})`;
                    option.disabled = playerStats.ki < kiCost; 
                    techniqueSelect.appendChild(option);
                });
                const combatAttackButton = document.getElementById('combat-attack-button');
                if (combatAttackButton) combatAttackButton.disabled = false;
            }
            techniqueSelect.dataset.lastCombatEnemy = enemyName;
        } else {
            Array.from(techniqueSelect.options).forEach(option => {
                if (option.value) {
                    const tech = getTechById(option.value);
                    if (tech) {
                        const kiCost = playerStats.race === 'Andróide' ? 0 : tech.cost;
                        option.disabled = playerStats.ki < kiCost;
                    }
                }
            });
        }
    } else {
        console.warn("updateCombatUI: Elemento 'player-technique-select' NÃO encontrado.");
    }
    
    const attackButton = document.getElementById('combat-attack-button');
    if (attackButton) {
        attackButton.onclick = handleCombatTurn;
        attackButton.disabled = !combatState.isActive || (combatSystem && combatSystem.isTurnInProgress);
    } else {
        console.warn("updateCombatUI: Elemento 'combat-attack-button' NÃO encontrado.");
    }
}

// Expõe globalmente as funções que são chamadas diretamente pelo HTML (onclick)
window.startCombat = startCombat; 
window.endCombat = endCombat;     
window.handleCombatTurn = handleCombatTurn;