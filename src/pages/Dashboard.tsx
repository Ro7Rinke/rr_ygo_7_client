import { useEffect, useState } from "react";
import { getMe } from "../services/auth";
import type { User } from "../types/User";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem("token");

      if (!token) {
        window.location.href = "/";
        return;
      }

      try {
        const data = await getMe(token);
        setUser(data);
      } catch {
        localStorage.removeItem("token");
        window.location.href = "/";
      }
    }

    load();
  }, []);

  if (!user) return <p>Carregando...</p>;

  return (
    <div style={{ padding: 40 }}>
      <h1>Bem-vindo, {user.nickname}</h1>

      <p>Email: {user.email}</p>

      <h2>Stats</h2>
      <p>RP: {user.rp}</p>
      <p>Cash: {user.cash}</p>
      <p>Wins: {user.wins}</p>
      <p>Loses: {user.loses}</p>
      <p>Draws: {user.draws}</p>
    </div>
  );
}