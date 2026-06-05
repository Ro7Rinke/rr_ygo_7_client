import { load } from "@tauri-apps/plugin-store";

let store: Awaited<ReturnType<typeof load>>;

export const getStore = async () => {
  if (!store) {
    store = await load("settings.json");
  }
  return store;
};

export const savePath = async (path: string) => {
  const store = await getStore();
  await store.set("edopro_path", path);
  await store.save();
};

export const getPath = async (): Promise<string | null> => {
  const store = await getStore();
  return (await store.get("edopro_path")) as string | null;
};

export const setLasEmail = (email: string) => {
  localStorage.setItem("last_email", email);
}

export const getLastEmail = (): string | null => {
  return localStorage.getItem("last_email");
}

export const setAuthToken = (token: string) => {
  localStorage.setItem("auth_token", token)
}

export const getAuthToken = () => {
  return localStorage.getItem("auth_token");
}

export const removeAuthToken = () => {
  localStorage.removeItem("auth_token");
}