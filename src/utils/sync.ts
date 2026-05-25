import { getCards, getUserCards } from "../services/cards";
import { getPath } from "./store";
import { writeTextFile, mkdir, exists } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { syncReplays } from "./replay";

export async function syncEdoPro() {
  const basePath = await getPath();

  if (!basePath) {
    throw new Error("Caminho do EDOPro não configurado");
  }

  const lflistsPath = await join(basePath, "lflists");

  if (!(await exists(lflistsPath))) {
    await mkdir(lflistsPath, { recursive: true });
  }

  const [allCards, userCards] = await Promise.all([
    getCards(1),
    getUserCards(),
  ]);

  // =========================
  // 🟢 MY CARDS (whitelist)
  // =========================
  const myList: string[] = [];

  myList.push("!My Cards");
  myList.push("$whitelist");

  for (const card of userCards) {
    let limit = 0;

    if (card.amount === 1) limit = 1;
    else if (card.amount === 2) limit = 2;
    else if (card.amount >= 3) limit = 3;

    if (limit > 0) {
      myList.push(`${card.card_id} ${limit}`);
    }
  }

  // =========================
  // 🔵 RR7-CARDS (tudo liberado)
  // =========================
  const rr7List: string[] = [];

  rr7List.push("!RR7 All Cards");
  rr7List.push("$whitelist");

  for (const card of allCards) {
    rr7List.push(`${card.id} 3`);
  }

  // caminhos
  const myCardsPath = await join(lflistsPath, "my-cards.lflist.conf");
  const rr7Path = await join(lflistsPath, "rr7-all-cards.lflist.conf");

  await writeTextFile(myCardsPath, myList.join("\n"));
  await writeTextFile(rr7Path, rr7List.join("\n"));

  const result = await syncReplays(basePath);

  console.log(result)
  
  return {
    success: true,
    path: lflistsPath,
  };
}