// playerService.js
import { auth, db } from './auth.js';
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { playerStats } from './main.js';

/**
 * Salva o estado atual do personagem no Firestore
 */
export async function savePlayerToFirestore() {
    try {
        const user = auth.currentUser;
            console.log("[DEBUG] Tentando salvar player...");
            console.log("[DEBUG] Usuário logado:", user ? user.email : "Nenhum");
            console.log("[DEBUG] Stats:", playerStats);
        
        if (!user) throw new Error("Usuário não autenticado");

        const userDoc = doc(db, "users", user.uid);
        await setDoc(userDoc, {
            email: user.email,
            characterName: playerStats.name,
            race: playerStats.race,
            level: playerStats.level,
            xp: playerStats.xp,
            zeni: playerStats.coins,
            attributes: playerStats.attributes,
            attributePoints: playerStats.attributePoints,
            upgrades: playerStats.upgrades,
            learnedTechniques: playerStats.learnedTechniques,
            health: playerStats.health,
            ki: playerStats.ki,
            power: playerStats.power,
            defense: playerStats.defense,
            lastUpdated: new Date()
        }, { merge: true }); // merge evita sobrescrever tudo

        console.log("🔥 Personagem atualizado no Firestore!");
    } catch (error) {
        console.error("❌ Erro ao salvar no Firestore:", error);
    }
}
