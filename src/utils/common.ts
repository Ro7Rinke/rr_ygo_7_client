export type CardImageType = "full" | "small" | "cropped";

const PATHS: Record<CardImageType, string> = {
  full: "cards",
  small: "cards_small",
  cropped: "cards_cropped",
};

const BASE_URL = "https://images.ygoprodeck.com/images";

export const getCardImageUrl = (
  id: number,
  type: CardImageType = "full"
) => {
  return `${BASE_URL}/${PATHS[type]}/${id}.jpg`;
};

export const CardImageDefault = "https://static.wikia.nocookie.net/yugioh/images/7/7b/Back-BAM-EN-VG.png/revision/latest?cb=20120908091840"