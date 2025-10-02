import { listenForActiveMatches } from './pvpCombat.js';
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
    'Saiyajin': { emoji: '🐵', bonus: 'XP +5% / Poder +10% (Base)', xpBonus: 0.05, initialPower: 110, initialDefense: 15, techniques: [
        { id: 'saiyajin_kame', name: 'Kamehameha', description: 'Ataque de energia padrão (Dano Padrão).', minLevel: 1, cost: 10, type: 'Attack', powerMult: 1.2 },
        { id: 'saiyajin_oozaru', name: 'Oozaru (Fúria)', description: 'Aumenta Poder de Luta em 50% por um turno.', minLevel: 5, cost: 20, type: 'Buff', powerMult: 1.5, duration: 1 },
        { id: 'saiyajin_ssj', name: 'Super Saiyajin', description: 'Aumenta Poder de Luta em 100% permanentemente. (Lendário)', minLevel: 10, cost: 50, type: 'Transform', powerMult: 2.0, permanent: true },
    ]},
    'Humano': { emoji: '🧑', bonus: 'Nenhum (Aprendizado Padrão)', xpBonus: 0.0, initialPower: 100, initialDefense: 10, techniques: [
        { id: 'humano_kikoho', name: 'Kikoho', description: 'Ataque de dano fixo (Alto Dano, Alto Custo).', minLevel: 1, cost: 15, type: 'Attack', powerMult: 1.5 },
        { id: 'humano_kaioken', name: 'Kaioken', description: 'Duplica seu Poder de Luta momentaneamente, mas causa dano ao usuário.', minLevel: 5, cost: 20, type: 'Buff', powerMult: 2.0, duration: 1, selfDamage: 0.1 },
        { id: 'humano_genkidama', name: 'Genki Dama', description: 'Ataque massivo que requer acúmulo (Longa Espera).', minLevel: 10, cost: 100, type: 'Ultimate', powerMult: 3.0 },
    ]},
    'Namekuseijin': { emoji: '🐉', bonus: 'Regeneração de HP +50%', xpBonus: 0.0, initialPower: 95, initialDefense: 20, techniques: [
        { id: 'nameku_regen', name: 'Regeneração', description: 'Restaura 50% da vida máxima (Alto Custo).', minLevel: 1, cost: 30, type: 'Heal', healMult: 0.5 },
        { id: 'nameku_makanko', name: 'Makenkosappo', description: 'Ataque perfurante que ignora parte da defesa.', minLevel: 5, cost: 25, type: 'Attack', powerMult: 1.4 },
        { id: 'nameku_fusion', name: 'Fusão Namek', description: 'Bônus permanente de 50% no Poder de Luta.', minLevel: 10, cost: 0, type: 'Transform', powerMult: 1.5, permanent: true },
    ]},
    'Andróide': { emoji: '🤖', bonus: 'KI Infinito (Custo de KI é 0)', xpBonus: 0.0, initialPower: 105, initialDefense: 25, techniques: [
        { id: 'androide_absorcao', name: 'Absorção', description: 'Rouba poder do inimigo e cura o usuário.', minLevel: 1, cost: 0, type: 'Absorb', powerMult: 1.0 },
        { id: 'androide_canhao', name: 'Canhão de Energia', description: 'Ataque de dano explosivo e preciso.', minLevel: 5, cost: 0, type: 'Attack', powerMult: 1.3 },
        { id: 'androide_self_destruct', name: 'Autodestruição', description: 'Dano massivo no inimigo, mas deixa o usuário com 1 HP.', minLevel: 10, cost: 0, type: 'Ultimate', powerMult: 5.0, selfDamage: 0.99 },
    ]},
    'Kaioshin': { emoji: '✨', bonus: 'Treinamento Aprimorado (XP +10%)', xpBonus: 0.10, initialPower: 90, initialDefense: 10, techniques: [
        { id: 'kaio_teleport', name: 'Teletransporte', description: 'Permite escapar de batalhas difíceis (Defesa).', minLevel: 1, cost: 5, type: 'Utility', powerMult: 0.1 },
        { id: 'kaio_magic_heal', name: 'Magia de Cura', description: 'Cura total (Alto Custo).', minLevel: 5, cost: 50, type: 'Heal', healMult: 1.0 },
        { id: 'kaio_potara', name: 'Fusão Potara', description: 'Bônus permanente de 150% no Poder de Luta. (Lendário)', minLevel: 10, cost: 100, type: 'Transform', powerMult: 2.5, permanent: true },
    ]},
};
export const UPGRADE_DATA = {
    'xp_boost': {
        name: 'Treino de Concentração', 
        description: 'Aumenta permanentemente o ganho de XP em +5% por nível.', 
        cost: [500, 1000, 2000], 
        maxLevel: 3,
        effect: 0.05 
    }
};
export const ENEMY_DATA = {
    'Saibaman':         { emoji:'🌱', level:1,  power:50,  defense:5,  health:200,  maxHealth:200,  xpReward:20,   zeniReward:50,   difficulty:'Muito Fácil', img:'imagens/inimigos/saibaman.png' },
    'Raditz':           { emoji:'😈', level:3,  power:120, defense:12, health:350,  maxHealth:350,  xpReward:40,   zeniReward:80,   difficulty:'Fácil',       img:'imagens/inimigos/raditz.png' },
    'Nappa':            { emoji:'💪', level:5,  power:180, defense:18, health:450,  maxHealth:450,  xpReward:60,   zeniReward:100,  difficulty:'Fácil',       img:'imagens/inimigos/nappa.png' },
    'Vegeta (Saiyajin)':{ emoji:'👊', level:8,  power:250, defense:25, health:600,  maxHealth:600,  xpReward:90,   zeniReward:150,  difficulty:'Médio',       img:'imagens/inimigos/vegeta_saiyajin.png' },
    'Dodoria':          { emoji:'💥', level:10, power:300, defense:30, health:700,  maxHealth:700,  xpReward:120,  zeniReward:180,  difficulty:'Médio',       img:'imagens/inimigos/dodoria.png' },
    'Zarbon':           { emoji:'🪞', level:12, power:340, defense:34, health:800,  maxHealth:800,  xpReward:140,  zeniReward:200,  difficulty:'Médio',       img:'imagens/inimigos/zarbon.png' },
    'Ginyu Force':      { emoji:'🎯', level:15, power:400, defense:40, health:950,  maxHealth:950,  xpReward:180,  zeniReward:240,  difficulty:'Difícil',     img:'imagens/inimigos/ginyu.png' },
    'Freeza (Forma 1)': { emoji:'👽', level:18, power:480, defense:48, health:1100, maxHealth:1100, xpReward:220,  zeniReward:280,  difficulty:'Difícil',     img:'imagens/inimigos/freeza1.png' },
    'Freeza (Final)':   { emoji:'👽', level:20, power:550, defense:55, health:1300, maxHealth:1300, xpReward:260,  zeniReward:320,  difficulty:'Desafiador',  img:'imagens/inimigos/freeza_final.png' },
    'Android 19':       { emoji:'🤖', level:23, power:600, defense:60, health:1400, maxHealth:1400, xpReward:300,  zeniReward:360,  difficulty:'Difícil',     img:'imagens/inimigos/android19.png' },
    'Android 18':       { emoji:'👩‍🦳', level:25, power:650, defense:65, health:1500, maxHealth:1500, xpReward:340, zeniReward:400, difficulty:'Difícil',     img:'imagens/inimigos/android18.png' },
    'Android 17':       { emoji:'🧑‍🦱', level:27, power:680, defense:68, health:1600, maxHealth:1600, xpReward:380, zeniReward:440, difficulty:'Difícil',     img:'imagens/inimigos/android17.png' },
    'Cell (Imperfeito)':{ emoji:'🐛', level:30, power:750, defense:75, health:1800, maxHealth:1800, xpReward:420, zeniReward:480, difficulty:'Difícil',     img:'imagens/inimigos/cell1.png' },
    'Cell (Semi-Perfeito)':{ emoji:'🐛', level:33, power:820, defense:82, health:2000, maxHealth:2000, xpReward:460, zeniReward:520, difficulty:'Difícil', img:'imagens/inimigos/cell2.png' },
    'Cell (Perfeito)':  { emoji:'🐛', level:36, power:900, defense:90, health:2200, maxHealth:2200, xpReward:500, zeniReward:560, difficulty:'Desafiador',  img:'imagens/inimigos/cell3.png' },
    'Cell Jr.':         { emoji:'👾', level:38, power:950, defense:95, health:2300, maxHealth:2300, xpReward:540, zeniReward:600, difficulty:'Desafiador',  img:'imagens/inimigos/celljr.png' },
    'Dabura':           { emoji:'😈', level:40, power:1000, defense:100, health:2500, maxHealth:2500, xpReward:580, zeniReward:640, difficulty:'Desafiador', img:'imagens/inimigos/dabura.png' },
    'Majin Vegeta':     { emoji:'⚡', level:43, power:1100, defense:110, health:2700, maxHealth:2700, xpReward:620, zeniReward:680, difficulty:'Desafiador', img:'imagens/inimigos/majin_vegeta.png' },
    'Majin Buu (Gordo)':{ emoji:'🍬', level:46, power:1200, defense:120, health:3000, maxHealth:3000, xpReward:660, zeniReward:720, difficulty:'Difícil',   img:'imagens/inimigos/buu_gordo.png' },
    'Super Buu':        { emoji:'🍬', level:50, power:1350, defense:135, health:3300, maxHealth:3300, xpReward:700, zeniReward:760, difficulty:'Difícil',   img:'imagens/inimigos/super_buu.png' },
    'Kid Buu':          { emoji:'👶', level:55, power:1500, defense:150, health:3700, maxHealth:3700, xpReward:750, zeniReward:800, difficulty:'Extremo',   img:'imagens/inimigos/kid_buu.png' },
    'Garlic Jr.':       { emoji:'🧄', level:58, power:1600, defense:160, health:4000, maxHealth:4000, xpReward:800, zeniReward:850, difficulty:'Extremo',   img:'imagens/inimigos/garlic.png' },
    'Cooler (Forma Final)':{ emoji:'❄️', level:60, power:1700, defense:170, health:4200, maxHealth:4200, xpReward:850, zeniReward:900, difficulty:'Extremo', img:'imagens/inimigos/cooler.png' },
    'Metal Cooler':     { emoji:'🤖', level:63, power:1850, defense:185, health:4500, maxHealth:4500, xpReward:900, zeniReward:950, difficulty:'Extremo',   img:'imagens/inimigos/metal_cooler.png' },
    'Janemba':          { emoji:'👹', level:67, power:2000, defense:200, health:4800, maxHealth:4800, xpReward:950, zeniReward:1000,difficulty:'Extremo',   img:'imagens/inimigos/janemba.png' },
    'Broly (Filme 8)':  { emoji:'🐲', level:70, power:2200, defense:220, health:5200, maxHealth:5200, xpReward:1000,zeniReward:1100,difficulty:'Lendário',  img:'imagens/inimigos/broly.png' },
    'Broly (Bio)':      { emoji:'🐉', level:74, power:2400, defense:240, health:5600, maxHealth:5600, xpReward:1100,zeniReward:1200,difficulty:'Lendário',  img:'imagens/inimigos/broly_bio.png' },
    'Bojack':           { emoji:'💀', level:78, power:2600, defense:260, health:6000, maxHealth:6000, xpReward:1200,zeniReward:1300,difficulty:'Lendário',  img:'imagens/inimigos/bojack.png' },
    'Hirudegarn':       { emoji:'🦖', level:82, power:2800, defense:280, health:6400, maxHealth:6400, xpReward:1300,zeniReward:1400,difficulty:'Lendário',  img:'imagens/inimigos/hirudegarn.png' },
    'Vegetto (Majin Buu)':{ emoji:'💥', level:86, power:3000, defense:300, health:7000, maxHealth:7000, xpReward:1500,zeniReward:1600,difficulty:'Lendário', img:'imagens/inimigos/vegetto.png' },
    'Gogeta (Janemba)':   { emoji:'💥', level:90, power:3300, defense:330, health:7500, maxHealth:7500, xpReward:1700,zeniReward:1800,difficulty:'Lendário', img:'imagens/inimigos/gogeta.png' },
    'Gohan Místico':      { emoji:'🔥', level:94, power:3600, defense:360, health:8000, maxHealth:8000, xpReward:1900,zeniReward:2000,difficulty:'Supremo',  img:'imagens/inimigos/gohan_mistico.png' },
    'Goku SSJ3':          { emoji:'⚡', level:97, power:4000, defense:400, health:8500, maxHealth:8500, xpReward:2200,zeniReward:2300,difficulty:'Supremo',  img:'imagens/inimigos/goku_ssj3.png' },
    'Vegeta SSJ2':      { emoji:'⚡', level:99, power:4200, defense:420, health:9000, maxHealth:9000, xpReward:2500,zeniReward:2600,difficulty:'Supremo',  img:'imagens/inimigos/vegeta_ssj2.png' },
    'Ultimate Z-Final':   { emoji:'🌌', level:100,power:4500, defense:450, health:10000,maxHealth:10000,xpReward:3000,zeniReward:3000,difficulty:'Supremo',  img:'imagens/inimigos/ultimate.png' }
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

let currentView = null;

export async function loadView(viewName, viewParams = {}) {
  if (combatState.isActive && viewName !== 'arena') {
    logMessage('Você não pode sair enquanto estiver em combate!', 'text-red-500');
    return;
  }
  if (currentView === viewName && viewName !== 'pvp-combat') { // pvp-combat pode precisar recarregar
    return;
  }
  currentView = viewName;
  window.currentView = viewName; // Disponibiliza globalmente

  try {
    const response = await fetch(`views/${viewName}.html`);
    if (!response.ok) throw new Error('Falha ao carregar view');
    const html = await response.text();
    mainContentArea.innerHTML = html;
    logMessage(`📺 Carregou tela: ${viewName}`, 'text-gray-500');

    switch(viewName) {
      case 'character-creation':
        const creationModule = await import('./characterCreation.js');
        creationModule.initCharacterCreationScreen();
        break;
      case 'status':
        updateUI(); // A UI já é atualizada, mas aqui garantimos a atualização da tela de status
        break;
      case 'meditation':
        const meditationModule = await import('./meditation.js');
        meditationModule.initMeditationScreen();
        break;
      case 'combat-selection':
        const treinoModule = await import('./treino.js');
        treinoModule.showCombatSelectionScreen();
        break;
      case 'arena':
        const combateModule = await import('./combate.js');
        combateModule.updateCombatUI(viewParams);
        break;
      case 'mestreKame':
        const mestreKameModule = await import('./mestreKame.js');
        mestreKameModule.showMestreKameMenu('techniques');
        break;
      case 'atributos':
        const atributosModule = await import('./atributos.js');
        atributosModule.showAttributeManagerScreen();
        break;
      case 'challenges':
        const challengesModule = await import('./challenges.js');
        challengesModule.loadChallengesScreen(viewParams);
        break;
      case 'pvp-combat':
        try {
          const pvpModule = await import('./pvpCombat.js');
          await pvpModule.loadPvpCombatScreen(viewParams);
        } catch (err) {
          console.error('Erro ao carregar pvpCombat.js:', err);
          logMessage('❌ Erro ao carregar a tela PvP Combat', 'text-red-500');
        }
        break;
    }
  } catch(error) {
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
      playerStats = { ...playerStats, ...parsedData };
    } catch (err) {
      console.error('Erro ao analisar JSON do localStorage:', err);
      localStorage.removeItem('rpgPlayerStats');
    }
  }
}

export function saveLocalState() {
  try {
    localStorage.setItem('rpgPlayerStats', JSON.stringify(playerStats));
  } catch (err) {
    console.error('Erro ao salvar no localStorage:', err);
    logMessage('❌ Erro ao salvar o progresso localmente.', 'text-red-500');
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
  
  playerStats.basePower = raceInfo.initialPower + strength * 10 + ki_control * 3 + (playerStats.level - 1) * 20;
  playerStats.baseMaxHealth = 100 + raceInfo.initialPower / 2 + vitality * 25 + (playerStats.level - 1) * 10;
  playerStats.baseDefense = raceInfo.initialDefense + vitality * 3 + (playerStats.level - 1) * 1;
  playerStats.baseMaxKi = 100 + ki_control * 15;

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
  const safeUpdate = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  
  const name = playerStats.name || '---';
  safeUpdate('left-player-name-title', name);
  safeUpdate('left-player-name-val', name);
  safeUpdate('left-player-race-val', playerStats.race || '---');
  safeUpdate('left-player-level-val', playerStats.level);
  safeUpdate('left-player-power-val', playerStats.power);
  safeUpdate('left-player-zeni-val', playerStats.coins);
  safeUpdate('left-player-attr-points-val', playerStats.attributePoints);
  
  const hp = Math.max(0, Math.floor(playerStats.health));
  const maxHp = Math.floor(playerStats.maxHealth);
  safeUpdate('left-player-hp-val', `${hp}/${maxHp}`);
  const hpBar = document.getElementById('left-player-hp-bar');
  if (hpBar) hpBar.style.width = `${Math.max(0, (hp / maxHp) * 100)}%`;

  const ki = Math.max(0, Math.floor(playerStats.ki));
  const maxKi = Math.floor(playerStats.maxKi);
  safeUpdate('left-player-ki-val', `${ki}/${maxKi}`);
  const kiBar = document.getElementById('left-player-ki-bar');
  if (kiBar) kiBar.style.width = `${Math.max(0, (ki / maxKi) * 100)}%`;

  // 🔥 ATUALIZAÇÃO: Popula a tela de Status também
  if (currentView === 'status') {
    safeUpdate('stats-name-display', name);
    safeUpdate('stats-race-display', playerStats.race || '---');
    safeUpdate('stats-level-display', playerStats.level);
    safeUpdate('stats-xp-display', `${playerStats.xp}/${XP_TO_LEVEL}`);
    safeUpdate('stats-power-display', playerStats.power);
    safeUpdate('stats-defense-display', playerStats.defense);
    safeUpdate('stats-coins-display', playerStats.coins);
    safeUpdate('stats-attribute-points-display', playerStats.attributePoints);
    safeUpdate('stats-xp-multiplier-display', `+${(playerStats.xpMultiplier - 1.0) * 100}%`);
    
    safeUpdate('stats-health-display', `${hp}/${maxHp}`);
    const statusHpBar = document.getElementById('stats-health-bar');
    if (statusHpBar) statusHpBar.style.width = `${Math.max(0, (hp / maxHp) * 100)}%`;

    safeUpdate('stats-ki-display', `${ki}/${maxKi}`);
    const statusKiBar = document.getElementById('stats-ki-bar');
    if (statusKiBar) statusKiBar.style.width = `${Math.max(0, (ki / maxKi) * 100)}%`;
  }
}

export function getTechById(techId) {
  if (!playerStats.race) return null;
  const raceTechs = RACE_DATA[playerStats.race]?.techniques;
  return raceTechs ? raceTechs.find((t) => t.id === techId) : null;
}
window.getTechById = getTechById;

export async function initGame() {
  loadPlayerState();
  listenForActiveMatches();
}

window.onload = initGame;
window.loadView = loadView;
