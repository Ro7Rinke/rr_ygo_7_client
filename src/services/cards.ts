import { api } from "./api";

export async function syncCards(token: string) {
  const res = await api.post(
    "/cards/sync",
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data;
}

export async function getCards(inGame?: number) {
    const params = inGame != null && inGame != undefined
        ? `?in_game=${inGame}`
        : ""
  const res = await api.get(`/cards${params}`);
  return res.data;
}