import axios from "axios";
import { getAuthToken } from "../utils/store";
const API_URL = import.meta.env.VITE_API_URL;

export const api = axios.create({
  baseURL: API_URL
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});