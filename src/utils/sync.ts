import { getCards, getUserCards } from "../services/cards";
import { getPath } from "./store";
import { readTextFile, writeTextFile, mkdir, exists } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { syncReplays } from "./replay";
import { getMe } from "../services/auth";

/**
 * Atualiza o nickname do usuário dentro do arquivo config/system.conf do EDOPro.
 * @param basePath Caminho base onde a pasta 'config' está localizada.
 * @param newNickname O novo nick que será injetado no arquivo.
 */
export async function updateEdoproNickname(basePath: string, newNickname: string): Promise<boolean> {
  try {
    const configPath = await join(basePath, "config", "system.conf");

    if (!(await exists(configPath))) {
      console.log("Arquivo system.conf não foi encontrado no caminho especificado.");
      return false;
    }

    const content = await readTextFile(configPath);

    const nicknameRegex = /^(nickname\s*=\s*)(.*)$/m;

    let updatedContent = "";

    if (nicknameRegex.test(content)) {
      updatedContent = content.replace(nicknameRegex, `$1${newNickname}`);
    } else {
      updatedContent = content.trim() + `\nnickname = ${newNickname}\n`;
    }

    await writeTextFile(configPath, updatedContent);

    return true;
  } catch (err) {
    console.log("Erro ao atualizar o nickname no EDOPro:", err);
    return false;
  }
}

export async function syncEdoPro() {
  const basePath = await getPath();

  if (!basePath) {
    throw new Error("Caminho do EDOPro não configurado");
  }

  const lflistsPath = await join(basePath, "lflists");

  if (!(await exists(lflistsPath))) {
    await mkdir(lflistsPath, { recursive: true });
  }

  const [user, allCards, userCards] = await Promise.all([
    getMe(),
    getCards(1),
    getUserCards(),
  ]);

  await updateEdoproNickname(basePath, user.nickname)

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

  await syncReplays(basePath);

  return {
    success: true,
    path: lflistsPath,
  };
}