import { api } from "./api";

export async function uploadReplay(file: File) {
  const formData = new FormData();

  formData.append("file", file);

  const res = await api.post("/game/upload-replay", formData);

  return res.data;
}