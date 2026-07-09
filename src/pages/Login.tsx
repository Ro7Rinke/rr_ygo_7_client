import { useEffect, useState } from "react";
import { getMe, login } from "../services/auth";
import { useNavigate } from "react-router-dom";
import { getAuthToken, getLastEmail, removeAuthToken, setAuthToken, setLasEmail } from "../utils/store";
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const navigate = useNavigate();


  async function checkUpdate() {
    try {
      const update = await check();

      if (update) {
        setIsUpdating(true);

        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started':
              console.log(`Download iniciado. Tamanho: ${event.data.contentLength}`);
              break;
            case 'Progress':
              console.log(`Baixados ${event.data.chunkLength} bytes`);
              break;
            case 'Finished':
              console.log('Download concluído!');
              break;
          }
        });

        await relaunch();
      }
    } catch (error) {
      console.error("Erro na verificação de update:", error);
    }
  }

  async function handleLogin() {
    try {
      const data = await login(email, password);
      setAuthToken(data.access_token);

      setLasEmail(email)

      navigate("/dashboard");
    } catch {
      alert("Erro no login");
    }
  }

  useEffect(() => {
    async function load() {
      try {
        await checkUpdate()

        const last_email = getLastEmail();
        if (last_email) setEmail(last_email);

        const token = getAuthToken();
        if (token) {
          try {
            const user = await getMe();
            if (user) {
              navigate("/dashboard")
            } else {
              removeAuthToken()
            }
          } catch (e) {
            removeAuthToken()
          }
        }
      } catch (e) {

      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  if (isUpdating) {
    return (
      <div>
        Atualizando aplicativo...
      </div>
    )
  }

  if (isLoading) {
    return (
      <div style={container}>
        <div style={card}>
          <p style={title}>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={container}>
      <div style={card}>
        <h1 style={title}>Login</h1>

        <input
          style={input}
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          style={input}
          type="password"
          placeholder="Senha"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          style={button}
          onClick={handleLogin}
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
          Entrar
        </button>

        <p style={text}>
          Não tem conta?{" "}
          <a href="/signup" style={link}>
            Criar conta
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