// combatSystem.js
export class CombatSystem {
    constructor(player, enemy) {
        this.player = player;
        this.enemy = enemy;
        this.turn = 'player';
        this.battleLog = [];
        this.isTurnInProgress = false;
    }

    // Sistema de turnos dinâmico
    async executeTurn(playerAction) {
        if (this.isTurnInProgress) {
            console.warn("Turno já em progresso, ignorando clique duplo.");
            return;
        }
        
        this.isTurnInProgress = true;
        
        try {
            // 1. Turno do jogador
            await this.playerTurn(playerAction);
            if (this.checkBattleEnd()) return;
            
            // Pequena pausa entre turnos
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // 2. Turno do inimigo
            await this.enemyTurn();
            if (this.checkBattleEnd()) return;
            
        } finally {
            this.isTurnInProgress = false;
        }
    }

    async playerTurn(action) {
        const { technique } = action;
        
        // Validação de KI
        if (this.player.ki < technique.cost && this.player.race !== 'Andróide') {
            this.addToLog(`KI insuficiente para ${technique.name}!`, 'error');
            return;
        }

        // Executa técnica do jogador
        await this.executeTechnique(this.player, this.enemy, technique);
        this.processEndOfTurnEffects();
    }

    async enemyTurn() {
        const actions = this.getAvailableEnemyActions();
        const action = this.selectEnemyAction(actions);
        
        await new Promise(resolve => setTimeout(resolve, 600)); // Pausa dramática
        
        switch(action.type) {
            case 'attack':
                await this.enemyAttack(action);
                break;
            case 'special':
                if (this.enemy.ki >= (action.cost || 30)) {
                    await this.enemySpecial(action);
                } else {
                    await this.enemyAttack(this.getBasicAttack());
                }
                break;
            case 'defend':
                await this.enemyDefend();
                break;
            case 'heal':
                await this.enemyHeal(action);
                break;
            default:
                await this.enemyAttack(this.getBasicAttack());
        }
        
        this.processEndOfTurnEffects();
    }

    getAvailableEnemyActions() {
        const actions = [
            { type: 'attack', priority: 1, powerMult: 1.0 },
            { type: 'special', priority: 2, cost: 30, powerMult: 1.5 }
        ];

        // Inimigo se cura se estiver com menos de 30% de vida
        if (this.enemy.health / this.enemy.maxHealth < 0.3) {
            actions.push({ 
                type: 'heal', 
                priority: 3, 
                healAmount: Math.floor(this.enemy.maxHealth * 0.3) 
            });
        }

        // Inimigo se defende se estiver com pouca vida
        if (this.enemy.health / this.enemy.maxHealth < 0.5) {
            actions.push({ type: 'defend', priority: 2 });
        }

        return actions;
    }

    selectEnemyAction(actions) {
        const validActions = actions.filter(action => {
            if (action.cost && this.enemy.ki < action.cost) return false;
            return true;
        });

        if (validActions.length === 0) return this.getBasicAttack();

        // Seleção baseada em peso/prioridade
        const weights = validActions.map(action => action.priority);
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;

        for (let i = 0; i < validActions.length; i++) {
            random -= weights[i];
            if (random <= 0) return validActions[i];
        }

        return validActions[0];
    }

    async executeTechnique(attacker, defender, technique) {
        const kiCost = attacker.race === 'Andróide' ? 0 : technique.cost;
        attacker.ki -= kiCost;

        this.addToLog(`${attacker.name} usou ${technique.name}!`, 'player-action');

        switch(technique.type) {
            case 'Attack':
            case 'Ultimate':
                const damage = this.calculateDamage(attacker, defender, technique);
                defender.health = Math.max(0, defender.health - damage);
                this.addToLog(`Causou ${damage} de dano!`, 'damage');
                break;

            case 'Heal':
                const healAmount = Math.floor(attacker.maxHealth * technique.healMult);
                attacker.health = Math.min(attacker.maxHealth, attacker.health + healAmount);
                this.addToLog(`Recuperou ${healAmount} de vida!`, 'heal');
                break;

            case 'Buff':
                this.applyBuff(attacker, technique);
                break;

            case 'Transform':
                this.applyTransformation(attacker, technique);
                break;

            case 'Absorb':
                const absorbDamage = this.calculateDamage(attacker, defender, technique);
                defender.health = Math.max(0, defender.health - absorbDamage);
                const absorbHeal = Math.floor(absorbDamage * 0.5);
                attacker.health = Math.min(attacker.maxHealth, attacker.health + absorbHeal);
                this.addToLog(`Causou ${absorbDamage} e absorveu ${absorbHeal} de vida!`, 'absorb');
                break;

            case 'Utility':
                this.addToLog(`${technique.name} - Preparando manobra estratégica!`, 'info');
                // Lógica especial para técnicas de utilidade
                if (technique.id === 'kaio_teleport' && Math.random() < 0.5) {
                    this.addToLog("✨ Teletransporte bem-sucedido! Fuga automática.", 'info');
                    this.endBattle('flee');
                    return;
                }
                break;
        }

        // Efeitos visuais
        await this.playTechniqueAnimation(technique);
    }

    calculateDamage(attacker, defender, technique) {
        const baseDamage = attacker.currentPower * (technique.powerMult || 1.0);
        const defenseReduction = defender.defense * 0.3;
        let finalDamage = Math.max(1, baseDamage - defenseReduction);

        // Chance de crítico (10%)
        const isCritical = Math.random() < 0.1;
        if (isCritical) {
            finalDamage *= 1.5;
            this.addToLog('⭐ ATAQUE CRÍTICO!', 'critical');
        }

        // Chance de desvio (baseada na velocidade)
        const dodgeChance = (defender.speed - attacker.speed) * 0.01;
        if (Math.random() < Math.max(0, dodgeChance)) {
            this.addToLog(`${defender.name} desviou do ataque!`, 'dodge');
            return 0;
        }

        return Math.floor(finalDamage);
    }

    applyBuff(attacker, technique) {
        const existingBuffIndex = attacker.activeBuffs.findIndex(buff => buff.id === technique.id);
        
        if (existingBuffIndex !== -1) {
            attacker.activeBuffs[existingBuffIndex].duration = technique.duration;
            this.addToLog(`${technique.name} renovado!`, 'buff');
        } else {
            attacker.activeBuffs.push({
                id: technique.id,
                duration: technique.duration,
                powerMult: technique.powerMult
            });
            this.addToLog(`${technique.name} ativado! Poder aumentado!`, 'buff');
        }

        // Dano próprio de técnicas como Kaioken
        if (technique.selfDamage) {
            const selfDamage = Math.floor(attacker.maxHealth * technique.selfDamage);
            attacker.health = Math.max(0, attacker.health - selfDamage);
            this.addToLog(`Recebeu ${selfDamage} de dano do esforço!`, 'self-damage');
        }

        this.recalculateStats();
    }

    applyTransformation(attacker, technique) {
        if (technique.permanent && !attacker.activeTransformations.includes(technique.id)) {
            attacker.activeTransformations.push(technique.id);
            this.addToLog(`Transformação ${technique.name} ativada! Poder drasticamente aumentado!`, 'buff');
        } else if (!technique.permanent) {
            // Transformação temporária - implementar se necessário
            this.addToLog(`${technique.name} ativada temporariamente!`, 'buff');
        } else {
            this.addToLog(`Você já está em ${technique.name}.`, 'info');
        }
        this.recalculateStats();
    }

    async enemyAttack(action) {
        const damage = this.calculateDamage(this.enemy, this.player, action);
        this.player.health = Math.max(0, this.player.health - damage);
        this.addToLog(`${this.enemy.name} atacou, causando ${damage} de dano!`, 'enemy-action');
        await this.playTechniqueAnimation({ type: 'Attack' });
    }

    async enemySpecial(action) {
        const damage = this.calculateDamage(this.enemy, this.player, action);
        this.player.health = Math.max(0, this.player.health - damage);
        this.enemy.ki -= (action.cost || 30);
        this.addToLog(`${this.enemy.name} usou um ataque especial, causando ${damage} de dano!`, 'enemy-action');
        await this.playTechniqueAnimation({ type: 'Ultimate' });
    }

    async enemyDefend() {
        this.addToLog(`${this.enemy.name} assume posição defensiva!`, 'info');
        // Implementar lógica de defesa se desejar
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    async enemyHeal(action) {
        const healAmount = action.healAmount || Math.floor(this.enemy.maxHealth * 0.3);
        this.enemy.health = Math.min(this.enemy.maxHealth, this.enemy.health + healAmount);
        this.addToLog(`${this.enemy.name} se curou em ${healAmount} de vida!`, 'heal');
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    processEndOfTurnEffects() {
        // Processa buffs do jogador
        this.player.activeBuffs = this.player.activeBuffs.filter(buff => {
            buff.duration--;
            if (buff.duration <= 0) {
                this.addToLog(`Efeito de ${this.getTechName(buff.id)} terminou!`, 'buff-end');
                return false;
            }
            return true;
        });

        // Processa buffs do inimigo
        if (this.enemy.activeBuffs) {
            this.enemy.activeBuffs = this.enemy.activeBuffs.filter(buff => {
                buff.duration--;
                if (buff.duration <= 0) {
                    this.addToLog(`Efeito no ${this.enemy.name} terminou!`, 'info');
                    return false;
                }
                return true;
            });
        }

        this.recalculateStats();
    }

    recalculateStats() {
        this.applyCombatBuffs(this.player);
        this.applyCombatBuffs(this.enemy);
    }

    applyCombatBuffs(character) {
        let powerMultiplier = 1.0;
        
        // Aplica transformações permanentes
        character.activeTransformations.forEach(transformId => {
            const tech = this.getTechById(transformId);
            if (tech && tech.powerMult) {
                powerMultiplier *= tech.powerMult;
            }
        });

        // Aplica buffs temporários
        character.activeBuffs.forEach(buff => {
            const tech = this.getTechById(buff.id);
            if (tech && tech.powerMult) {
                powerMultiplier *= tech.powerMult;
            }
        });

        character.currentPower = Math.round(character.basePower * powerMultiplier);
    }

    checkBattleEnd() {
        if (this.player.health <= 0) {
            this.endBattle('defeat');
            return true;
        }
        
        if (this.enemy.health <= 0) {
            this.endBattle('victory');
            return true;
        }
        
        return false;
    }

    endBattle(result) {
        this.isTurnInProgress = false;
        
        // Dispara evento customizado para o combate.js saber que terminou
        const event = new CustomEvent('battleEnded', { 
            detail: { 
                result, 
                player: this.player, 
                enemy: this.enemy 
            }
        });
        document.dispatchEvent(event);
    }

    addToLog(message, type = 'info') {
        this.battleLog.push({ message, type, timestamp: new Date() });
        
        // Dispara evento para atualizar a UI
        const event = new CustomEvent('combatLogUpdate', { 
            detail: { message, type }
        });
        document.dispatchEvent(event);
    }

    async playTechniqueAnimation(technique) {
        // Implementar animações baseadas na técnica
        // Por enquanto, apenas uma pausa para efeito dramático
        const animationTime = technique.type === 'Ultimate' ? 800 : 400;
        await new Promise(resolve => setTimeout(resolve, animationTime));
    }

    // Helper methods
    getTechById(techId) {
        // Usa a função global do main.js
        return window.getTechById?.(techId);
    }

    getTechName(techId) {
        const tech = this.getTechById(techId);
        return tech ? tech.name : 'Técnica';
    }

    getBasicAttack() {
        return { type: 'attack', powerMult: 1.0, priority: 1 };
    }
}