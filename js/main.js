// main.js - Core do Jogo

// --- Configurações e Estado do Jogo ---

export let playerStats = {
  name: null,
  race: null,
  level: 1,
  xp: 0,
  power: 100,
  health: 100,
  maxHealth: 100,
  ki: 100,
  maxKi: 100,
  defense: 10,
  attributePoints: 0,
  attributes: {
    strength: 10,
    vitality: 10,
    ki_control: 10,
  },
  coins: 0,
  learnedTechniques: [],
  xpMultiplier: 1.0,
  upgrades: { xp_boost: 0 },
  activeBuffs: [],
  activeTransformations: [],
  basePower: 100,
  baseDefense: 10,
  baseMaxHealth: 100,
  baseMaxKi: 100,
};
export const XP_TO_LEVEL = 100;
export const POINTS_PER_LEVEL = 5;

export let combatState = {
  isActive: false,
  enemyName: null,
  enemy: null,
  currentEnemyHealth: 0,
  currentEnemyMaxHealth: 0,
};

export const RACE_DATA = {
  // suas raças aqui...
};

export const UPGRADE_DATA = {
  // seus upgrades aqui...
};

const logElement = document.getElementById('game-log');
const mainContentArea = document.getElementById('main-content-area');

export function logMessage(message, className = 'text-gray-300') {
  const div = document.createElement('div');
  div.className = `log-message ${className}`;
  div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  logElement.prepend(div);
  while (logElement.children.length > 50) {
    logElement.removeChild(logElement.lastChild);
  }
}

export async function loadView(viewName) {
  if (combatState.isActive && viewName !== 'arena') {
    logMessage(
      'Você não pode sair do combate enquanto ele estiver ativo!',
      'text-red-500'
    );
    return;
  }
  console.log(`[main.js] Tentando carregar view: ${viewName}`);
  try {
    const response = await fetch(`views/${viewName}.html`);
    if (!response.ok)
      throw new Error(`Não foi possível carregar a view ${viewName}.html`);
    const html = await response.text();
    mainContentArea.innerHTML = html;
    logMessage(`📺 Carregou tela: ${viewName}`, 'text-gray-500');

    switch (viewName) {
      case 'character-creation':
        const creationModule = await import('./characterCreation.js');
        creationModule.initCharacterCreationScreen();
        break;
      case 'status':
        updateUI();
        break;
      // demais cases...
    }
  } catch (error) {
    console.error(error);
    logMessage(`❌ Erro ao carregar a tela '${viewName}'`, 'text-red-500');
    mainContentArea.innerHTML = `<p class="text-red-500 text-center mt-8">Erro ao carregar a tela. Verifique o console para detalhes.</p>`;
  }
}

export function loadPlayerState() {
  const localData = localStorage.getItem('rpgPlayerStats');
  if (localData) {
    try {
      const parsedData = JSON.parse(localData);
      playerStats = {
        ...playerStats,
        ...parsedData,
        attributes: { ...playerStats.attributes, ...parsedData.attributes },
        upgrades: { ...parsedData.upgrades, ...playerStats.upgrades },
        activeBuffs: parsedData.activeBuffs || [],
        activeTransformations: parsedData.activeTransformations || [],
        basePower: parsedData.basePower || playerStats.basePower,
        baseDefense: parsedData.baseDefense || playerStats.baseDefense,
        baseMaxHealth: parsedData.baseMaxHealth || playerStats.baseMaxHealth,
        baseMaxKi: parsedData.baseMaxKi || playerStats.baseMaxKi,
      };
    } catch (e) {
      console.error('Erro ao analisar JSON do localStorage:', e);
      localStorage.removeItem('rpgPlayerStats');
    }
  }
}

export function saveLocalState() {
  try {
    const stateToSave = {
      name: playerStats.name,
      race: playerStats.race,
      level: playerStats.level,
      xp: playerStats.xp,
      coins: playerStats.coins,
      attributePoints: playerStats.attributePoints,
      attributes: playerStats.attributes,
      learnedTechniques: playerStats.learnedTechniques,
      upgrades: playerStats.upgrades,
      power: playerStats.power,
      maxHealth: playerStats.maxHealth,
      defense: playerStats.defense,
      maxKi: playerStats.maxKi,
      health: playerStats.health,
      ki: playerStats.ki,
      activeBuffs: playerStats.activeBuffs,
      activeTransformations: playerStats.activeTransformations,
      basePower: playerStats.basePower,
      baseDefense: playerStats.baseDefense,
      baseMaxHealth: playerStats.baseMaxHealth,
      baseMaxKi: playerStats.baseMaxKi,
    };
    localStorage.setItem('rpgPlayerStats', JSON.stringify(stateToSave));
  } catch (e) {
    console.error('Erro ao salvar no localStorage:', e);
    logMessage(
      '❌ Erro ao salvar o progresso localmente. O navegador pode estar cheio.',
      'text-red-500'
    );
  }
}

export function calculateXpMultiplier(stats) {
  if (!stats.race) return 1.0;
  let multiplier = 1.0;
  const raceInfo = RACE_DATA[stats.race];
  if (raceInfo && raceInfo.xpBonus) multiplier += raceInfo.xpBonus;
  const xpUpgradeLevel = stats.upgrades?.xp_boost || 0;
  const xpUpgradeInfo = UPGRADE_DATA['xp_boost'];
  if (xpUpgradeLevel > 0 && xpUpgradeInfo)
    multiplier += xpUpgradeLevel * xpUpgradeInfo.effect;
  return Math.round(multiplier * 100) / 100;
}

export function updateCalculatedStats() {
  if (!playerStats.race) return;
  const raceInfo = RACE_DATA[playerStats.race];
  const { strength, vitality, ki_control } = playerStats.attributes;
  const totalLevelBonus = playerStats.level - 1;

  playerStats.basePower = raceInfo.initialPower + strength * 10 + ki_control * 3;
  playerStats.baseMaxHealth = 100 + raceInfo.initialPower / 2 + vitality * 25;
  playerStats.baseDefense = raceInfo.initialDefense + vitality * 3;
  playerStats.baseMaxKi = 100 + ki_control * 15;

  if (totalLevelBonus > 0) {
    playerStats.basePower += totalLevelBonus * 20;
    playerStats.baseMaxHealth += totalLevelBonus * 10;
    playerStats.baseDefense += totalLevelBonus * 1;
  }

  playerStats.power = playerStats.basePower;
  playerStats.maxHealth = playerStats.baseMaxHealth;
  playerStats.defense = playerStats.baseDefense;
  playerStats.maxKi = playerStats.baseMaxKi;

  playerStats.activeTransformations.forEach((transformId) => {
    const tech = getTechById(transformId);
    if (tech && tech.type === 'Transform' && tech.powerMult) {
      playerStats.power = Math.round(playerStats.power * tech.powerMult);
    }
  });

  playerStats.xpMultiplier = calculateXpMultiplier(playerStats);
  playerStats.health = Math.min(playerStats.health, playerStats.maxHealth);
  playerStats.ki = Math.min(playerStats.ki, playerStats.maxKi);
}

export function updateUI() {
  const leftPlayerNameTitle = document.getElementById('left-player-name-title');
  if (leftPlayerNameTitle) leftPlayerNameTitle.textContent = playerStats.name || '---';

  const leftPlayerNameVal = document.getElementById('left-player-name-val');
  if (leftPlayerNameVal) leftPlayerNameVal.textContent = playerStats.name || '---';

  const leftPlayerRaceVal = document.getElementById('left-player-race-val');
  if (leftPlayerRaceVal) leftPlayerRaceVal.textContent = playerStats.race || '---';

  const leftPlayerLevelVal = document.getElementById('left-player-level-val');
  if (leftPlayerLevelVal) leftPlayerLevelVal.textContent = playerStats.level;

  const leftPlayerHpVal = document.getElementById('left-player-hp-val');
  if (leftPlayerHpVal)
    leftPlayerHpVal.textContent = `${Math.max(
      0,
      Math.floor(playerStats.health)
    )}/${Math.floor(playerStats.maxHealth)}`;

  const leftPlayerHpBar = document.getElementById('left-player-hp-bar');
  if (leftPlayerHpBar) {
    const hpPercent = (playerStats.health / playerStats.maxHealth) * 100;
    leftPlayerHpBar.style.width = `${Math.max(0, hpPercent)}%`;
  }

  const leftPlayerKiVal = document.getElementById('left-player-ki-val');
  if (leftPlayerKiVal)
    leftPlayerKiVal.textContent = `${Math.max(
      0,
      Math.floor(playerStats.ki)
    )}/${Math.floor(playerStats.maxKi)}`;

  const leftPlayerKiBar = document.getElementById('left-player-ki-bar');
  if (leftPlayerKiBar) {
    const kiPercent = (playerStats.ki / playerStats.maxKi) * 100;
    leftPlayerKiBar.style.width = `${Math.max(0, kiPercent)}%`;
  }

  const leftPlayerPowerVal = document.getElementById('left-player-power-val');
  if (leftPlayerPowerVal) leftPlayerPowerVal.textContent = playerStats.power;

  const leftPlayerZeniVal = document.getElementById('left-player-zeni-val');
  if (leftPlayerZeniVal) leftPlayerZeniVal.textContent = playerStats.coins;

  const leftPlayerAttrPointsVal = document.getElementById('left-player-attr-points-val');
  if (leftPlayerAttrPointsVal) leftPlayerAttrPointsVal.textContent =
    playerStats.attributePoints;

  if (document.getElementById('stats-name-display')) {
    document.getElementById('stats-name-display').textContent =
      playerStats.name || '---';
    document.getElementById('stats-race-display').textContent =
      playerStats.race || '---';
    document.getElementById('stats-level-display').textContent = playerStats.level;
    document.getElementById('stats-xp-display').textContent = `${playerStats.xp} / ${XP_TO_LEVEL}`;
    document.getElementById('stats-power-display').textContent = playerStats.power;
    document.getElementById('stats-defense-display').textContent = playerStats.defense;

    const healthPercent = (playerStats.health / playerStats.maxHealth) * 100;
    document.getElementById('stats-health-display').textContent = `${Math.max(
      0,
      Math.floor(playerStats.health)
    )}/${Math.floor(playerStats.maxHealth)}`;
    document.getElementById('stats-health-bar').style.width = `${Math.max(
      0,
      healthPercent
    )}%`;

    const kiPercent = (playerStats.ki / playerStats.maxKi) * 100;
    document.getElementById('stats-ki-display').textContent = `${Math.max(
      0,
      Math.floor(playerStats.ki)
    )}/${Math.floor(playerStats.maxKi)}`;
    document.getElementById('stats-ki-bar').style.width = `${Math.max(
      0,
      kiPercent
    )}%`;

    document.getElementById('stats-coins-display').textContent = playerStats.coins;
    document.getElementById('stats-attribute-points-display').textContent =
      playerStats.attributePoints;
    const xpBonusPercentage = Math.round((playerStats.xpMultiplier - 1.0) * 100);
    document.getElementById('stats-xp-multiplier-display').textContent = `+${xpBonusPercentage}%`;

    const attrList = document.getElementById('base-attributes-list');
    if (attrList) {
      attrList.innerHTML = `
                <li>Força (STR): ${playerStats.attributes.strength}</li>
                <li>Vigor (VIT): ${playerStats.attributes.vitality}</li>
                <li>Controle de Ki (KI): ${playerStats.attributes.ki_control}</li>
            `;
    }

    const learnedList = document.getElementById('learned-techniques-list');
    if (learnedList) {
      learnedList.innerHTML = '';
      if (playerStats.learnedTechniques.length > 0) {
        playerStats.learnedTechniques.forEach((techId) => {
          const tech = getTechById(techId);
          const li = document.createElement('li');
          li.textContent = `• ${tech ? tech.name : techId}`;
          learnedList.appendChild(li);
        });
      } else {
        learnedList.innerHTML = '<li class="italic text-gray-500">Nenhuma</li>';
      }
    }
  }
}

export function disableActions(disabled) {
  document.querySelectorAll('.action-btn, #create-character-button, .menu-link').forEach(
    (element) => {
      if (element.tagName === 'A' || element.classList.contains('menu-link')) {
        if (disabled) {
          element.style.pointerEvents = 'none';
          element.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
          element.style.pointerEvents = 'auto';
          element.classList.remove('opacity-50', 'cursor-not-allowed');
        }
      } else {
        element.disabled = disabled;
      }
    }
  );
}

export function getTechById(techId) {
  if (!playerStats.race) return null;
  const raceTechs = RACE_DATA[playerStats.race]?.techniques;
  return raceTechs ? raceTechs.find((t) => t.id === techId) : null;
}
window.getTechById = getTechById;

export async function initGame() {
  loadPlayerState();
}

window.onload = initGame;
window.loadView = loadView;
window.disableActions = disableActions;
