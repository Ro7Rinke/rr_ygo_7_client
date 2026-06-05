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

export async function getAllBoosters(): Promise<any> {
  const res = await api.get("/boosters/all");
  return res.data;
}

export async function createSealedDeck(payload: any) {
  const res = await api.post("/boosters/sealed-deck", payload);

  return res.data;
}

export async function getSealedDecks(): Promise<any> {
  const res = await api.get("/boosters/sealed-decks");
  return res.data;
}

export async function getAllSealedDecks(): Promise<any> {
  const res = await api.get("/boosters/sealed-deck/all");
  return res.data;
}

export async function activateBooster(id: number) {
  const res = await api.post(`/boosters/${id}/activate`);
  return res.data;
}

export async function activateSealedDeck(id: number) {
  const res = await api.post(`/boosters/sealed-deck/${id}/activate`);
  return res.data;
}

export async function buySealedDeck(id: number) {
  const res = await api.post(`/boosters/sealed-deck/buy/${id}`);
  return res.data;
}