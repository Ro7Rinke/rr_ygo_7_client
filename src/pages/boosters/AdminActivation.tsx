import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthToken } from "../../utils/store";
import { getMe } from "../../services/auth";

import { getAllBoosters, activateBooster, getAllSealedDecks, activateSealedDeck } from "../../services/booster";

interface ProductItem {
  id: number;
  title: string;
  code: string;
  prefix: string;
  price: number;
  status: number;
  money_type: string;
  total_cards?: number; // Exclusivo de SealedDecks
  cards_per_pack?: number; // Exclusivo de Boosters
}

export default function AdminActivation() {
  const navigate = useNavigate();
  
  const [boosters, setBoosters] = useState<ProductItem[]>([]);
  const [sealedDecks, setSealedDecks] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadPendingProducts = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        navigate("/");
        return;
      }

      const user = await getMe();
      if (!user || user.is_admin !== 1) {
        alert("Acesso negado.");
        navigate("/dashboard");
        return;
      }

      const [allBoosters, allDecks] = await Promise.all([
        getAllBoosters(),
        getAllSealedDecks()
      ]);

      setBoosters((allBoosters || []).filter((b: ProductItem) => b.status === 2));
      setSealedDecks((allDecks || []).filter((d: ProductItem) => d.status === 2));

    } catch (error) {
      console.error("Erro ao carregar pendências:", error);
      alert("Falha ao carregar lista de ativação.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingProducts();
  }, []);

  /* ================= AÇÕES DE ATIVAÇÃO ================= */

  const handleActivateBooster = async (id: number) => {
    const key = `booster-${id}`;
    try {
      setProcessingId(key);
      await activateBooster(id);
      alert("Booster ativado e lançado com sucesso!");
      setBoosters(prev => prev.filter(b => b.id !== id));
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Erro ao ativar booster.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleActivateSealedDeck = async (id: number) => {
    const key = `deck-${id}`;
    try {
      setProcessingId(key);
      await activateSealedDeck(id);
      alert("Sealed Deck ativado e colocado à venda com sucesso!");
      setSealedDecks(prev => prev.filter(d => d.id !== id));
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Erro ao ativar Sealed Deck.");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <p>Buscando produtos pendentes de liberação...</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "1200px", margin: "0 auto 20px auto" }}>
        <h1 style={titleStyle}>Lançamentos Pendentes (Status 2)</h1>
        <button style={backButtonStyle} onClick={() => navigate(-1)}>Voltar</button>
      </div>

      <div style={gridStyle}>
        
        {/* ================= COLUNA BOOSTERS ================= */}
        <div style={columnStyle}>
          <h2 style={sectionTitle}>Boosters ({boosters.length})</h2>
          {boosters.length === 0 ? (
            <p style={emptyText}>Nenhum booster pendente de ativação.</p>
          ) : (
            boosters.map((b) => (
              <div key={`b-${b.id}`} style={itemCardStyle}>
                <div>
                  <h3 style={itemTitle}>{b.title}</h3>
                  <p style={itemMeta}><strong>Code:</strong> {b.code} | <strong>Prefix:</strong> {b.prefix}</p>
                  <p style={itemMeta}><strong>Preço:</strong> {b.price} {b.money_type.toUpperCase()}</p>
                </div>
                <button
                  style={activateButtonStyle}
                  disabled={processingId !== null}
                  onClick={() => handleActivateBooster(b.id)}
                >
                  {processingId === `booster-${b.id}` ? "Ativando..." : "Liberar Booster"}
                </button>
              </div>
            ))
          )}
        </div>

        {/* ================= COLUNA DE_DECKS SELADOS ================= */}
        <div style={columnStyle}>
          <h2 style={sectionTitle}>Decks Estruturados / Selados ({sealedDecks.length})</h2>
          {sealedDecks.length === 0 ? (
            <p style={emptyText}>Nenhum deck pendente de ativação.</p>
          ) : (
            sealedDecks.map((d) => (
              <div key={`d-${d.id}`} style={itemCardStyle}>
                <div>
                  <h3 style={itemTitle}>{d.title}</h3>
                  <p style={itemMeta}><strong>Code:</strong> {d.code} | <strong>Prefix:</strong> {d.prefix}</p>
                  <p style={itemMeta}><strong>Total de Cards:</strong> {d.total_cards || "Fixo"} | <strong>Preço:</strong> {d.price} {d.money_type.toUpperCase()}</p>
                </div>
                <button
                  style={{ ...activateButtonStyle, background: "linear-gradient(135deg, #10b981, #059669)" }}
                  disabled={processingId !== null}
                  onClick={() => handleActivateSealedDeck(d.id)}
                >
                  {processingId === `deck-${d.id}` ? "Ativando..." : "Liberar Deck"}
                </button>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}

/* ================= COMPLEMENTO DE ESTILOS DESIGN MINIMALISTA HIGH-CONTRAST ================= */

const containerStyle: React.CSSProperties = {
  padding: "40px 20px",
  background: "linear-gradient(180deg, #0f172a, #020617)",
  minHeight: "100vh",
  color: "#fff",
  fontFamily: "sans-serif",
};

const titleStyle: React.CSSProperties = {
  fontSize: "26px",
  fontWeight: "800",
  background: "linear-gradient(90deg, #38bdf8, #6366f1)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const backButtonStyle: React.CSSProperties = {
  padding: "8px 16px",
  background: "rgba(255,255,255,0.1)",
  border: "none",
  borderRadius: "6px",
  color: "#fff",
  cursor: "pointer",
  fontWeight: "600",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))",
  gap: "24px",
  maxWidth: "1200px",
  margin: "0 auto",
};

const columnStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.02)",
  borderRadius: "12px",
  padding: "20px",
  border: "1px solid rgba(255, 255, 255, 0.05)",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: "700",
  marginBottom: "16px",
  borderBottom: "2px solid rgba(255,255,255,0.05)",
  paddingBottom: "8px",
};

const itemCardStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "rgba(255, 255, 255, 0.05)",
  padding: "16px",
  borderRadius: "8px",
  marginBottom: "12px",
  border: "1px solid rgba(255, 255, 255, 0.03)",
};

const itemTitle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: "700",
  margin: 0,
};

const itemMeta: React.CSSProperties = {
  fontSize: "13px",
  color: "#94a3b8",
  margin: "4px 0 0 0",
};

const activateButtonStyle: React.CSSProperties = {
  padding: "10px 16px",
  fontSize: "13px",
  fontWeight: "700",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
  color: "#fff",
  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
  whiteSpace: "nowrap",
};

const emptyText: React.CSSProperties = {
  color: "#64748b",
  fontStyle: "italic",
  fontSize: "14px",
};