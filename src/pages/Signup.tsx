import { useState } from "react";
import { signup } from "../services/auth";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const navigate = useNavigate();

  async function handleSignup() {
    try {
      await signup(email, password, nickname);
      alert("Conta criada!");
      navigate("/");
    } catch (e) {
      console.log(e);
      alert("Erro no cadastro");
    }
  }

  return (
    <div style={container}>
      <div style={card}>
        <h1 style={title}>Criar conta</h1>

        <input
          style={input}
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          style={input}
          placeholder="Nickname"
          onChange={(e) => setNickname(e.target.value)}
        />

        <input
          style={input}
          type="password"
          placeholder="Senha"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          style={button}
          onClick={handleSignup}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "scale(1.05)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.transform = "scale(1)")
          }
          onMouseDown={(e) =>
            (e.currentTarget.style.transform = "scale(0.95)")
          }
          onMouseUp={(e) =>
            (e.currentTarget.style.transform = "scale(1.05)")
          }
        >
          Criar conta
        </button>

        <p style={text}>
          Já tem conta?{" "}
          <a href="/" style={link}>
            Fazer login
          </a>
        </p>
      </div>
    </div>
  );
}

/* ================= STYLE ================= */

const container: React.CSSProperties = {
  height: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#0f172a",
};

const card: React.CSSProperties = {
  background: "#1e293b",
  padding: "40px",
  borderRadius: "16px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  width: "300px",
};

const title: React.CSSProperties = {
  color: "#fff",
  textAlign: "center",
};

const input: React.CSSProperties = {
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#fff",
  outline: "none",
};

const button: React.CSSProperties = {
  padding: "10px",
  fontWeight: "700",
  borderRadius: "10px",
  border: "none",
  cursor: "pointer",
  color: "#fff",
  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
  boxShadow: "0 4px 12px rgba(99,102,241,0.5)",
  transition: "all 0.2s ease",
};

const text: React.CSSProperties = {
  color: "#cbd5f5",
  fontSize: "14px",
  textAlign: "center",
};

const link: React.CSSProperties = {
  color: "#818cf8",
  textDecoration: "none",
};