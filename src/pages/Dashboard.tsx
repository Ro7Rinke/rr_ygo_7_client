import { useEffect, useState } from "react";
import { getMe } from "../services/auth";
import { syncCards } from "../services/cards";
import type { User } from "../types/User";
import { useNavigate } from "react-router-dom";

// TAURI
import { open } from "@tauri-apps/plugin-dialog";
import { exists, readFile } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { checkIsTauri } from "../utils/common";
import { savePath, getPath, getAuthToken, removeAuthToken } from "../utils/store";
import { syncEdoPro } from "../utils/sync";
import { uploadReplay } from "../services/game";
import { handleImportBoosterJson } from "../utils/booster";

/* ================= CONFIG ================= */

const REQUIRED_FOLDERS = [
  "pics",
  "deck",
  "replay",
  "lflists",
  "expansions",
  "repositories",
  "config",
];

/* ================= COMPONENT ================= */

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [loadingSync, setLoadingSync] = useState(false);

  const [edoproPath, setEdoproPath] = useState<string | null>(null);
  const [folderStatus, setFolderStatus] = useState<Record<string, boolean>>({});
  const [isValidPath, setIsValidPath] = useState<boolean | null>(null);
  const [isTauri, setIsTauri] = useState<boolean>(false);
  const [loadingSyncEdoPro, setLoadingSyncEdoPro] = useState(false);

  /* ================= LOAD ================= */

  useEffect(() => {
    async function load() {
      const token = getAuthToken();

      if (!token) {
        navigate("/");
        return;
      }

      try {
        const tauriCheck = await checkIsTauri();
        setIsTauri(tauriCheck);

        const data = await getMe();

        if (!data) {
          throw new Error("User inválido");
        }

        setUser(data);

        if (tauriCheck) {
          const saved = await getPath();

          if (saved) {
            const existsBase = await exists(saved);

            //Se a pasta não existe mais → limpa tudo
            if (!existsBase) {
              await savePath("");
              setEdoproPath(null);
              setIsValidPath(false);
              return;
            }

            setEdoproPath(saved);
            await validateFolder(saved);

            await handleSyncEdoPro(true)
          }
        }
      } catch (e) {
        console.error("AUTH ERROR:", e);

        localStorage.removeItem("token");
        navigate("/");
      }
    }

    load();
  }, []);

  /* ================= VALIDATION ================= */

  const validateFolder = async (basePath: string) => {
    try {
      const results: Record<string, boolean> = {};

      for (const folder of REQUIRED_FOLDERS) {
        const fullPath = await join(basePath, folder);
        results[folder] = await exists(fullPath);
      }

      setFolderStatus(results);

      const allOk = Object.values(results).every(Boolean);
      setIsValidPath(allOk);
    } catch (e) {
      console.error(e);
      setIsValidPath(false);
    }
  };

  /* ================= SELECT FOLDER ================= */

  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (!selected) return;

      const path = Array.isArray(selected) ? selected[0] : selected;

      const existsBase = await exists(path);

      if (!existsBase) {
        alert("Pasta inválida");
        return;
      }

      await savePath(path);
      setEdoproPath(path);

      await validateFolder(path);
    } catch (e) {
      console.error(e);
      alert("Erro ao selecionar pasta");
    }
  };

  /* ================= SYNC ================= */

  const handleSync = async () => {
    const token = getAuthToken();
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

  const handleSyncEdoPro = async (isSilent: boolean = false) => {
    setLoadingSyncEdoPro(true);

    try {
      await syncEdoPro();
      if (!isSilent) alert("Sincronizado com sucesso.\nReinicie o EDOPro!");
    } catch (e: any) {
      console.error(e);
      if (!isSilent) alert(e.message || "Erro ao sincronizar EDOPro");
    } finally {
      setLoadingSyncEdoPro(false);
    }
  };

  const handleSendReplay = async () => {
    setLoadingSyncEdoPro(true);

    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Replay",
            extensions: ["yrp", "yrpX"],
          },
        ],
      });

      if (!selected) {
        setLoadingSyncEdoPro(false);
        return;
      }
      const fileBytes = await readFile(selected);
      const file = new File([fileBytes], "replay.yrpX");

      await uploadReplay(file);
      alert("Replay enviado com sucesso!");
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Erro ao enviar Replay");
    } finally {
      setLoadingSyncEdoPro(false);
    }
  };

  const handleLogOut = () => {
    removeAuthToken()
    navigate('/')
    return
  }

  /* ================= LOADING ================= */

  if (!user) {
    return (
      <div style={containerStyle}>
        <p>Carregando...</p>
      </div>
    );
  }

  /* ================= UI ================= */

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>Bem-vindo, {user.nickname}</h1>

      <div style={cardStyle}>
        <p><strong>Email:</strong> {user.email}</p>

        {/* ================= EDOPRO ================= */}
        {isTauri && (
          <>
            {/* <h2 style={sectionTitle}>EdoPro</h2> */}

            <div style={{ marginBottom: "10px", wordBreak: "break-all" }}>
              <strong>EDOPro:
                <span style={{ color: isValidPath ? "#22c55e" : "#ef4444" }}>
                  {isValidPath ? " Pasta válida ✅" : " Pasta inválida ❌"}
                </span>
              </strong><br />
              {edoproPath || "Não selecionado"}
            </div>

            <button style={buttonStyle} onClick={handleSelectFolder}>
              {edoproPath ? "Alterar pasta" : "Selecionar pasta"}
            </button>

            {/* {edoproPath && (
              <div style={{ marginTop: "15px", textAlign: "left" }}>
                <h3>Status das Pastas:</h3>

                {REQUIRED_FOLDERS.map((folder) => (
                  <div key={folder}>
                    {folder}:{" "}
                    <span style={{ color: folderStatus[folder] ? "#22c55e" : "#ef4444" }}>
                      {folderStatus[folder] ? "OK" : "Faltando"}
                    </span>
                  </div>
                ))}

                <div style={{ marginTop: "10px", fontWeight: "bold" }}>
                  Resultado:{" "}
                  <span style={{ color: isValidPath ? "#22c55e" : "#ef4444" }}>
                    {isValidPath ? "Pasta válida ✅" : "Pasta inválida ❌"}
                  </span>
                </div>
              </div>
            )} */}
          </>
        )}

        {/* ================= STATS ================= */}

        <h2 style={sectionTitle}>Stats</h2>

        <div style={statsGrid}>
          <div style={statBox}>RP<br />{user.rp}</div>
          <div style={statBox}>Cash<br />{user.cash}</div>
          <div style={statBox}>Wins<br />{user.wins}</div>
          <div style={statBox}>Loses<br />{user.loses}</div>
          <div style={statBox}>Draws<br />{user.draws}</div>
          <div style={statBox}>Tickets<br />{user.tickets}</div>
          <div style={statBox}>Gold Tickets<br />{user.gold_tickets}</div>
        </div>

        {/* ================= ADMIN ================= */}

        {user.is_admin == 1 && (
          <div style={buttonGroup}>
            <button
              onClick={handleSync}
              disabled={loadingSync}
              style={{
                ...buttonStyle,
                ...(loadingSync ? buttonDisabled : {}),
              }}
            >
              {loadingSync ? "Sincronizando..." : "Sincronizar Cards"}
            </button>

            <button
              style={buttonStyle}
              onClick={() => navigate(`/booster/create-booster`)}
            >
              Create Booster
            </button>
            <button
              onClick={handleImportBoosterJson}
              disabled={loadingSync}
              style={{
                ...buttonStyle,
                ...(loadingSync ? buttonDisabled : {}),
              }}
            >
              {loadingSync ? "Importando..." : "Importar Booster"}
            </button>
            <button
              style={buttonStyle}
              onClick={() => navigate(`/booster/admin-activation`)}
            >
              Ativar Booster
            </button>
          </div>
        )}

        {isTauri && edoproPath && isValidPath && (
          <div style={buttonGroup}>
            <button
              onClick={() => handleSyncEdoPro(false)}
              disabled={loadingSyncEdoPro}
              style={{
                ...buttonStyle,
                ...(loadingSync ? buttonDisabled : {}),
              }}
            >
              {loadingSyncEdoPro ? "Sincronizando EdoPro..." : "Sincronizar EdoPro"}
            </button>
            <button
              onClick={handleSendReplay}
              disabled={loadingSyncEdoPro}
              style={{
                ...buttonStyle,
                ...(loadingSync ? buttonDisabled : {}),
              }}
            >
              {loadingSyncEdoPro ? "Enviando Replay..." : "Enviar Replay"}
            </button>
          </div>
        )}

        <div style={buttonGroup}>
          <button
            style={{ ...buttonStyle, marginTop: "20px" }}
            onClick={() => navigate(`/booster/list-boosters`)}
          >
            List Boosters
          </button>
          <button
            style={buttonStyle}
            onClick={handleLogOut}
          >
            Sair
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
};

const buttonDisabled: React.CSSProperties = {
  opacity: 0.6,
  cursor: "not-allowed",
};