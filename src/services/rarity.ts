import { api } from "./api";

// Interface para tipar o retorno do endpoint de raridades
export interface Rarity {
  id: number;
  title: string;
  original_name: string;
  code: string;
  level: number;
}

export async function getRarities() {
  const res = await api.get("/rarity/all");
  return res.data as Rarity[];
}