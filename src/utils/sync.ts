import { getCards, getUserCards } from "../services/cards";
import { getPath } from "./store";
import { readTextFile, writeTextFile, mkdir, exists } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { syncReplays } from "./replay";
import { getMe } from "../services/auth";

interface ServerConfig {
  name: string;
  address: string;
  duelport: number;
  roomaddress: string;
  roomlistprotocol: string;
  roomlistport: number;
}

const RR_SERVER: ServerConfig = {
  name: "RR_YGO_7",
  address: "127.0.0.1",
  duelport: 7911,
  roomaddress: "rrygo7-pro-room.ro7rinke.com.br",
  roomlistprotocol: "https",
  roomlistport: 443
};

/**
 * Atualiza o nickname do usuário dentro do arquivo config/system.conf do EDOPro.
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

/**
 * Adiciona ou atualiza o servidor RR_YGO_7 dentro de config/configs.json
 */
export async function updateEdoproServers(basePath: string): Promise<boolean> {
  try {
    const configsJsonPath = await join(basePath, "config", "configs.json");

    if (!(await exists(configsJsonPath))) {
      console.log("Arquivo configs.json não foi encontrado em config/.");
      return false;
    }

    const rawContent = await readTextFile(configsJsonPath);
    const configsData = JSON.parse(rawContent);

    if (!Array.isArray(configsData.servers)) {
      configsData.servers = [];
    }

    // Procura se o servidor já existe pelo nome ou endereço da sala
    const existingIndex = configsData.servers.findIndex(
      (s: ServerConfig) => s.name === RR_SERVER.name || s.roomaddress === RR_SERVER.roomaddress
    );

    if (existingIndex !== -1) {
      // Se já existe, atualiza os dados caso tenha tido alteração nas portas/URLs
      configsData.servers[existingIndex] = RR_SERVER;
    } else {
      // Se não existe, adiciona no início da lista para prioridade do usuário
      configsData.servers.unshift(RR_SERVER);
    }

    await writeTextFile(configsJsonPath, JSON.stringify(configsData, null, 4));
    return true;
  } catch (err) {
    console.log("Erro ao atualizar os servidores no configs.json do EDOPro:", err);
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

  // Sincroniza nickname e servidor nos arquivos de config do EDOPro
  await updateEdoproNickname(basePath, user.nickname);
  await updateEdoproServers(basePath);

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