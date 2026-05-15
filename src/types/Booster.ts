export type SlotChance = {
  rarity_id: number;
  chance: number;
};

export type BoosterSlot = {
  position: number;
  unit_value: number;
  min_rarity_id: number;
  max_rarity_id: number;
  chances: SlotChance[];
};

export type Booster = {
  id: number;
  title: string;
  code: string;
  price: number;
  cards_per_pack: number;
  description?: string;
};