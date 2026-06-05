import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getBoosters, getSealedDecks } from "../../services/booster";
import type { Booster } from "../../types/Booster";
import BackButton from "../../components/BackButton";

// Definição da interface para os Decks Selados
interface SealedDeck {
  id: number;
  title: string;
  code: string;
  prefix: string;
  price: number;
  total_cards: number;
  money_type: string;
  is_initial: number;
}

export default function ListBoosters() {
  const [boosters, setBoosters] = useState<Booster[]>([]);
  const [sealedDecks, setSealedDecks] = useState<SealedDeck[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        
        // Busca ambos em paralelo para otimizar o carregamento
        const [boostersData, decksData] = await Promise.all([
          getBoosters(),
          getSealedDecks(),
        ]);

        setBoosters(boostersData || []);
        setSealedDecks(decksData || []);
      } catch (err) {
        console.error("Failed to load store items", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <div style={containerStyle}>
        <p>Loading store items...</p>
      </div>
    );
  }

  const noItems = boosters.length === 0 && sealedDecks.length === 0;

  return (
    <div style={containerStyle}>
      <BackButton />
      <h1 style={titleStyle}>Loja de Cartas</h1>

      {noItems && <p style={{ color: "#64748b", fontStyle: "italic" }}>Nenhum item disponível na loja no momento.</p>}

      {/* ================= SEÇÃO: BOOSTERS ================= */}
      {boosters.length > 0 && (
        <>
          <h2 style={sectionTitleStyle}>Boosters</h2>
          <div style={gridStyle}>
            {boosters.map((b) => (
              <div key={`booster-${b.id}`} style={cardStyle}>
                <h3 style={cardTitle}>{b.title}</h3>
                <p style={metaTextStyle}><strong>Code:</strong> {b.code}</p>
                <p style={metaTextStyle}><strong>Price:</strong> {b.price} {b.money_type?.toUpperCase() || "CASH"}</p>
                <p style={metaTextStyle}><strong>Cards per pack:</strong> {b.cards_per_pack}</p>

                <button
                  style={buttonStyle}
                  onClick={() => navigate(`/booster/buy-booster/${b.id}`)}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
                  onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
                >
                  Buy / Open Pack
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ================= SEÇÃO: SEALED DECKS ================= */}
      {sealedDecks.length > 0 && (
        <>
          <h2 style={{ ...sectionTitleStyle, marginTop: "40px", background: "linear-gradient(90deg, #10b981, #3b82f6)", WebkitBackgroundClip: "text" }}>
            Decks Estruturados & Selados
          </h2>
          <div style={gridStyle}>
            {sealedDecks.map((d) => (
              <div key={`deck-${d.id}`} style={{ ...cardStyle, borderLeft: d.is_initial ? "4px solid #10b981" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <h3 style={cardTitle}>{d.title}</h3>
                  {d.is_initial === 1 && (
                    <span style={badgeStyle}>Starter</span>
                  )}
                </div>
                <p style={metaTextStyle}><strong>Code:</strong> {d.code}</p>
                <p style={metaTextStyle}><strong>Price:</strong> {d.price} {d.money_type?.toUpperCase() || "CASH"}</p>
                <p style={metaTextStyle}><strong>Total cards:</strong> {d.total_cards}</p>

                <button
                  style={{ ...buttonStyle, background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 4px 12px rgba(16,185,129,0.3)" }}
                  onClick={() => navigate(`/booster/buy-sealed-deck/${d.id}`)} // Ajuste a rota para a página de compra do deck conforme seu router
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
                  onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
                >
                  Buy Deck
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ================= STYLES ================= */

const containerStyle: React.CSSProperties = {
  padding: "30px 20px",
  background: "linear-gradient(180deg, #0f172a, #020617)",
  minHeight: "100vh",
  color: "#fff",
  fontFamily: "sans-serif",
};

const titleStyle: React.CSSProperties = {
  fontSize: "32px",
  fontWeight: "800",
  marginBottom: "30px",
  textAlign: "center",
  background: "linear-gradient(90deg, #38bdf8, #6366f1)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: "700",
  textAlign: "left",
  maxWidth: "1200px",
  margin: "20px auto 12px auto",
  background: "linear-gradient(90deg, #38bdf8, #6366f1)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  paddingBottom: "6px",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "20px",
  maxWidth: "1200px",
  margin: "0 auto",
};

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  borderRadius: "12px",
  padding: "20px",
  backdropFilter: "blur(6px)",
  border: "1px solid rgba(255, 255, 255, 0.04)",
  textAlign: "left",
  transition: "transform 0.2s ease, border-color 0.2s ease",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

const cardTitle: React.CSSProperties = {
  margin: "0 0 12px 0",
  fontSize: "18px",
  fontWeight: "700",
  lineHeight: "1.3",
};

const metaTextStyle: React.CSSProperties = {
  margin: "4px 0",
  fontSize: "14px",
  color: "#cbd5e1",
};

const badgeStyle: React.CSSProperties = {
  background: "rgba(16, 185, 129, 0.15)",
  color: "#10b981",
  padding: "2px 8px",
  borderRadius: "6px",
  fontSize: "11px",
  fontWeight: "700",
  border: "1px solid rgba(16, 185, 129, 0.3)",
};

const buttonStyle: React.CSSProperties = {
  marginTop: "16px",
  width: "100%",
  padding: "11px",
  fontSize: "14px",
  fontWeight: "700",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
  color: "#fff",
  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
  boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
  transition: "all 0.2s ease",
};