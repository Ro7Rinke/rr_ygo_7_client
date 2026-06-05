import { useEffect, useMemo, useState } from "react";
import { getCards } from "../../services/cards";
import { createBooster } from "../../services/booster";
import { getMe } from "../../services/auth";
import type { BoosterSlot } from "../../types/Booster";
import BackButton from "../../components/BackButton";

type Card = {
    id: number;
    texts?: {
        name?: string;
    };
    status?: number; // 0 = unreleased
};

type SelectedCard = {
    card_id: number;
    rarity_id: number;
};

export default function CreateBooster() {
    const [cards, setCards] = useState<Card[]>([]);
    const [selected, setSelected] = useState<SelectedCard[]>([]);

    const [loading, setLoading] = useState(true);

    const [showOnlyUnreleased, setShowOnlyUnreleased] = useState(false);

    const [title, setTitle] = useState("");
    const [code, setCode] = useState("");
    const [price, setPrice] = useState(0);
    const [desc, setDesc] = useState("");

    const [slots, setSlots] = useState<BoosterSlot[]>([]);

    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        getMe().then(setUser);
    }, []);

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                const data = await getCards(1);
                setCards(data);
            } finally {
                setLoading(false);
            }
        }

        load();
    }, []);

    const visibleCards = useMemo(() => {
        let filtered = cards;

        if (showOnlyUnreleased) {
            filtered = filtered.filter((c) => c.status === 0);
        }

        return filtered.sort((a, b) => {
            const nameA = a.texts?.name ?? "";
            const nameB = b.texts?.name ?? "";

            return nameA.localeCompare(nameB);
        });
    }, [cards, showOnlyUnreleased]);

    function toggleCard(card: Card) {
        setSelected((prev) => {
            const exists = prev.find((c) => c.card_id === card.id);

            if (exists) {
                return prev.filter((c) => c.card_id !== card.id);
            }

            return [...prev, { card_id: card.id, rarity_id: 10 }];
        });
    }

    function changeRarity(card_id: number, rarity_id: number) {
        setSelected((prev) =>
            prev.map((c) =>
                c.card_id === card_id ? { ...c, rarity_id } : c
            )
        );
    }

    function addSlot() {
        setSlots((prev) => [
            ...prev,
            {
                position: prev.length + 1,
                unit_value: 0,
                min_rarity_id: 10,
                max_rarity_id: 50,
                chances: [
                    { rarity_id: 10, chance: 100 },
                ],
            },
        ]);
    }

    async function submit() {
        await createBooster({
            title,
            code,
            price,
            description: desc,
            cards: selected,
            slots: slots,
        });

        alert("Booster created!");
    }

    if (user && user.is_admin !== 1) {
        return <p>Not authorized</p>;
    }

    return (
        <div style={{ padding: 20 }}>
            <BackButton />
            <h1>Create Booster</h1>

            {loading && <p>Loading cards...</p>}

            <div style={{ marginBottom: 20 }}>
                <input placeholder="title" onChange={(e) => setTitle(e.target.value)} />
                <input placeholder="code" onChange={(e) => setCode(e.target.value)} />
                <input
                    placeholder="price"
                    type="number"
                    onChange={(e) => setPrice(Number(e.target.value))}
                />
                <textarea placeholder="description" onChange={(e) => setDesc(e.target.value)} />
            </div>

            <label>
                <input
                    type="checkbox"
                    checked={showOnlyUnreleased}
                    onChange={() => setShowOnlyUnreleased((v) => !v)}
                />
                Show only unreleased (status = 0)
            </label>

            <h2>Cards</h2>

            <div style={{ maxHeight: 400, overflow: "auto", border: "1px solid #ccc" }}>
                {visibleCards.map((card) => {
                    const selectedCard = selected.find(
                        (c) => c.card_id === card.id
                    );

                    const isSelected = !!selectedCard;

                    return (
                        <div
                            key={card.id}
                            style={{
                                display: "flex",
                                gap: 10,
                                padding: 6,
                                alignItems: "center",
                                background: isSelected ? "#333" : "transparent",
                                color: isSelected ? "#fff" : "#000",
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleCard(card)}
                            />

                            <span style={{ flex: 1 }}>
                                {card.id} - {card.texts?.name ?? "Unknown"}
                            </span>

                            {isSelected && (
                                <select
                                    value={selectedCard?.rarity_id ?? 10}
                                    onChange={(e) =>
                                        changeRarity(card.id, Number(e.target.value))
                                    }
                                >
                                    <option value={10}>Common</option>
                                    <option value={20}>Rare</option>
                                    <option value={30}>Super Rare</option>
                                    <option value={40}>Ultra Rare</option>
                                    <option value={50}>Secret Rare</option>
                                </select>
                            )}
                        </div>
                    );
                })}
            </div>

            <h2>Slots</h2>

            <button onClick={addSlot}>Add Slot</button>

            {slots.map((slot, idx) => (
                <div key={idx} style={{ border: "1px solid #444", padding: 10, marginTop: 10 }}>

                    <h4>Slot {slot.position}</h4>

                    <input
                        type="number"
                        placeholder="unit value"
                        value={slot.unit_value}
                        onChange={(e) => {
                            const value = Number(e.target.value);
                            setSlots((prev) =>
                                prev.map((s) =>
                                    s.position === slot.position
                                        ? { ...s, unit_value: value }
                                        : s
                                )
                            );
                        }}
                    />

                    {/* min rarity */}
                    <select
                        value={slot.min_rarity_id}
                        onChange={(e) => {
                            const value = Number(e.target.value);
                            setSlots((prev) =>
                                prev.map((s) =>
                                    s.position === slot.position
                                        ? { ...s, min_rarity_id: value }
                                        : s
                                )
                            );
                        }}
                    >
                        <option value={10}>Common</option>
                        <option value={20}>Rare</option>
                        <option value={30}>Super Rare</option>
                        <option value={40}>Ultra Rare</option>
                        <option value={50}>Secret Rare</option>
                    </select>

                    <select
                        value={slot.max_rarity_id}
                        onChange={(e) => {
                            const value = Number(e.target.value);
                            setSlots((prev) =>
                                prev.map((s) =>
                                    s.position === slot.position
                                        ? { ...s, max_rarity_id: value }
                                        : s
                                )
                            );
                        }}
                    >
                        <option value={10}>Common</option>
                        <option value={20}>Rare</option>
                        <option value={30}>Super Rare</option>
                        <option value={40}>Ultra Rare</option>
                        <option value={50}>Secret Rare</option>
                    </select>

                    <div>
                        <h5>Chances</h5>

                        {[10, 20, 30, 40, 50].map((rid) => {
                            const chance =
                                slot.chances.find((c) => c.rarity_id === rid)?.chance || 0;

                            return (
                                <div key={rid}>
                                    <label>{rid}</label>
                                    <input
                                        type="number"
                                        value={chance}
                                        onChange={(e) => {
                                            const value = Number(e.target.value);

                                            setSlots((prev) =>
                                                prev.map((s) => {
                                                    if (s.position !== slot.position) return s;

                                                    const updated = s.chances.filter(
                                                        (c) => c.rarity_id !== rid
                                                    );

                                                    return {
                                                        ...s,
                                                        chances: [
                                                            ...updated,
                                                            { rarity_id: rid, chance: value },
                                                        ],
                                                    };
                                                })
                                            );
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            <button onClick={submit} style={{ marginTop: 20 }}>
                Create Booster
            </button>
        </div>
    );
}