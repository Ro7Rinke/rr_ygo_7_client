import { platform } from "@tauri-apps/plugin-os";
import { exists } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getPath } from "../utils/store";

export type CardImageType = "full" | "small" | "cropped";

const PATHS: Record<CardImageType, string> = {
  full: "cards",
  small: "cards_small",
  cropped: "cards_cropped",
};

const BASE_URL = "https://images.ygoprodeck.com/images";

export const CardImageDefault =
  "https://static.wikia.nocookie.net/yugioh/images/7/7b/Back-BAM-EN-VG.png/revision/latest?cb=20120908091840";

/* ================= IMAGE RESOLVER ================= */

export const getCardImageUrl = async (
  id: number,
  type: CardImageType = "full"
): Promise<string> => {
  const isTauri = await checkIsTauri();

  if (!isTauri) {
    return `${BASE_URL}/${PATHS[type]}/${id}.jpg`;
  }

  try {
    const basePath = await getPath();

    if (!basePath) {
      return `${BASE_URL}/${PATHS[type]}/${id}.jpg`;
    }

    const imagePath = await join(basePath, "pics", `${id}.jpg`);

    const fileExists = await exists(imagePath);

    if (fileExists) {
      return convertFileSrc(imagePath);
    }

    return `${BASE_URL}/${PATHS[type]}/${id}.jpg`;
  } catch (e) {
    console.error("Erro ao buscar imagem local:", e);

    return `${BASE_URL}/${PATHS[type]}/${id}.jpg`;
  }
};

/* ================= TAURI CHECK ================= */

export const checkIsTauri = async () => {
  try {
    await platform();
    return true;
  } catch {
    return false;
  }
};