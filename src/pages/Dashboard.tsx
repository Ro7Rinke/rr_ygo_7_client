import { useEffect, useState } from "react";
import { getMe } from "../services/auth";
import { syncCards } from "../services/cards";
import type { User } from "../types/User";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [loadingSync, setLoadingSync] = useState(false);

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

  const handleSync = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoadingSync(true);

    try {
      await syncCards(token);
      alert("Cards sincronizados com sucesso!");
    } catch {
      alert("Erro ao sincronizar cards");
    } finally {
      setLoadingSync(false);
    }
  };

  if (!user) {
    return (
      <div style={containerStyle}>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>Bem-vindo, {user.nickname}</h1>

      <div style={cardStyle}>
        <p><strong>Email:</strong> {user.email}</p>

        <h2 style={sectionTitle}>Stats</h2>

        <div style={statsGrid}>
          <div style={statBox}>RP<br />{user.rp}</div>
          <div style={statBox}>Cash<br />{user.cash}</div>
          <div style={statBox}>Wins<br />{user.wins}</div>
          <div style={statBox}>Loses<br />{user.loses}</div>
          <div style={statBox}>Draws<br />{user.draws}</div>
        </div>

        {user.is_admin == 1 && (
          <div style={buttonGroup}>
            <button
              onClick={handleSync}
              disabled={loadingSync}
              style={{
                ...buttonStyle,
                ...(loadingSync ? buttonDisabled : {}),
              }}
              onMouseEnter={(e) =>
                !loadingSync && (e.currentTarget.style.transform = "scale(1.05)")
              }
              onMouseLeave={(e) =>
                !loadingSync && (e.currentTarget.style.transform = "scale(1)")
              }
              onMouseDown={(e) =>
                !loadingSync && (e.currentTarget.style.transform = "scale(0.95)")
              }
              onMouseUp={(e) =>
                !loadingSync && (e.currentTarget.style.transform = "scale(1.05)")
              }
            >
              {loadingSync ? "Sincronizando..." : "Sincronizar Cards"}
            </button>

            <button
              style={buttonStyle}
              onClick={() => navigate(`/booster/create-booster`)}
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
              Create Booster
            </button>
          </div>
        )}

        <div style={buttonGroup}>
          <button
          style={{ ...buttonStyle, marginTop: "20px" }}
          onClick={() => navigate(`/booster/list-boosters`)}
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
          List Boosters
        </button>
        </div>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const containerStyle: React.CSSProperties = {
  padding: "40px 20px",
  textAlign: "center",
  background: "linear-gradient(180deg, #0f172a, #020617)",
  minHeight: "100vh",
  color: "#fff",
};

const titleStyle: React.CSSProperties = {
  fontSize: "32px",
  fontWeight: "800",
  marginBottom: "20px",
  letterSpacing: "1px",
  textShadow: "0 4px 12px rgba(0,0,0,0.6)",
  background: "linear-gradient(90deg, #38bdf8, #6366f1)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const cardStyle: React.CSSProperties = {
  maxWidth: "600px",
  margin: "0 auto",
  padding: "20px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(6px)",
  boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
};

const sectionTitle: React.CSSProperties = {
  marginTop: "20px",
  marginBottom: "10px",
  fontSize: "20px",
};

const statsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
  gap: "10px",
};

const statBox: React.CSSProperties = {
  padding: "10px",
  borderRadius: "8px",
  background: "rgba(255,255,255,0.08)",
  fontWeight: "700",
};

const buttonGroup: React.CSSProperties = {
  marginTop: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const buttonStyle: React.CSSProperties = {
  padding: "12px",
  fontSize: "14px",
  fontWeight: "700",
  borderRadius: "10px",
  border: "none",
  cursor: "pointer",
  color: "#fff",
  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
  boxShadow: "0 6px 16px rgba(99,102,241,0.5)",
  transition: "all 0.2s ease",
};

const buttonDisabled: React.CSSProperties = {
  opacity: 0.6,
  cursor: "not-allowed",
  boxShadow: "none",
};