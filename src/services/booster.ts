import type { Booster } from "../types/Booster";
import { api } from "./api";

export async function createBooster(payload: any) {
  const res = await api.post("/boosters", payload);

  return res.data;
}

export async function buyBooster(id: number) {
  const res = await api.post(`/boosters/buy/${id}`);
  return res.data;
}

export async function getBoosters(): Promise<Booster[]> {
  const res = await api.get("/boosters");
  return res.data;
}