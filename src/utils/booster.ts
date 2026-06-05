import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { getRarities } from '../services/rarity';
import { createBooster, createSealedDeck } from '../services/booster';

export async function handleImportBoosterJson() {
    try {
        const selectedPath = await open({
            multiple: false,
            filters: [{ name: 'JSON', extensions: ['json'] }]
        });

        if (!selectedPath) return;

        const fileText = await readTextFile(selectedPath as string);
        const rawJson = JSON.parse(fileText);

        const dbRarities = await getRarities();
        const rarityCodeToIdMap: Record<string, number> = {};
        dbRarities.forEach((r) => {
            rarityCodeToIdMap[r.code] = r.id;
        });

        const deckTypes = ['starter-deck', 'structure-deck', 'sealed-deck'];
        const isDeck = deckTypes.includes(rawJson.type);

        if (isDeck) {
            /* ================= SEALED DECK ================= */
            const cardsPayload: Array<{ card_id: number; rarity_id: number; amount: number }> = [];
            let totalCardsCounter = 0;

            (rawJson.cards || []).forEach((c: any) => {
                const mappedRarityId = rarityCodeToIdMap[c.rarity];
                if (!mappedRarityId) {
                    throw new Error(`Raridade "${c.rarity}" na carta "${c.name}" não existe no banco.`);
                }

                const currentAmount = c.amount !== undefined ? Number(c.amount) : (c.qty !== undefined ? Number(c.qty) : 1);

                cardsPayload.push({
                    card_id: Number(c.id),
                    rarity_id: mappedRarityId,
                    amount: currentAmount,
                });

                totalCardsCounter += currentAmount;
            });

            const formattedDeckPayload = {
                title: rawJson.title,
                code: rawJson.code,
                prefix: rawJson.prefix,
                money_type: rawJson.money_type || rawJson.cash_type || "cash",
                price: Number(rawJson.price),
                description: rawJson.description || "",
                total_cards: totalCardsCounter,
                is_initial: rawJson.type === 'starter-deck' ? 1 : 0,
                status: 2,
                cards: cardsPayload,
            };

            await createSealedDeck(formattedDeckPayload);
            alert("Sealed Deck criado com sucesso!");
        } else {
            /* ================= BOOSTER ================= */

            const formattedBoosterPayload = {
                title: rawJson.title,
                code: rawJson.code,
                prefix: rawJson.prefix,
                money_type: rawJson.money_type || rawJson.cash_type || "cash",
                price: Number(rawJson.price),
                description: rawJson.description || "",
                cards: (rawJson.cards || []).map((c: any) => {
                    const mappedRarityId = rarityCodeToIdMap[c.rarity];
                    if (!mappedRarityId) {
                        throw new Error(`Raridade "${c.rarity}" na carta "${c.name}" não existe no banco.`);
                    }
                    return {
                        card_id: Number(c.id),
                        rarity_id: mappedRarityId,
                    };
                }),
                slots: (rawJson.slots || []).map((s: any) => ({
                    position: Number(s.position),
                    unit_value: s.unit_value !== undefined ? Number(s.unit_value) : 0,
                    groups: (s.groups || []).map((g: any) => ({
                        min_rarity_level: Number(g.min_rarity_level),
                        max_rarity_level: Number(g.max_rarity_level),
                        chance: Number(g.chance),
                    })),
                })),
            };

            await createBooster(formattedBoosterPayload);
            alert("Booster criado com sucesso!");
        }

    } catch (error: any) {
        console.error("Erro ao importar o arquivo:", error);
        alert(`Falha na importação: ${error.message || "Verifique o console."}`);
    }
}