import { api } from "./api";

export async function uploadReplay(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/game/upload-replay", formData);
  console.log(res)
  return res.data;
}

export async function checkReplayHashes(hashes: string[]) {
  const res = await api.post("/game/replay-hash/check", {
    hashes,
  });
  return res.data as {
    existing: string[];
    missing: string[];
  };
}