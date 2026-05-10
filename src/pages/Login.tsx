import { useState } from "react";
import { login } from "../services/auth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  async function handleLogin() {
    try {
      const data = await login(email, password);

      localStorage.setItem("token", data.access_token);

      navigate("/dashboard");
    } catch {
      alert("Erro no login");
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Login</h1>

      <input placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
      <br />
      <input type="password" placeholder="Senha" onChange={(e) => setPassword(e.target.value)} />
      <br />

      <button onClick={handleLogin}>Entrar</button>

      <p>
        Não tem conta? <a href="/signup">Criar conta</a>
      </p>
    </div>
  );
}