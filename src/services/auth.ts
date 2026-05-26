import { api } from "./api";

export async function login(email: string, password: string) {
  const res = await api.post("/auth/login", { email, password });
  console.log(res.data)
  return res.data;
}

export async function signup(email: string, password: string, nickname: string) {
  const res = await api.post("/auth/signup", { email, password, nickname });
  console.log(res.data)
  return res.data;
}

export async function getMe() {
  const res = await api.get("/player/me");
  return res.data;
}