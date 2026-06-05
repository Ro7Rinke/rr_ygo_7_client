import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getCardImageUrl, CardImageDefault } from "../../utils/common";
import BackButton from "../../components/BackButton";
import { buySealedDeck } from "../../services/booster";

interface CardItem {
  card_id: number;
  amount: number;
  name?: string;
  rarity_code: string;
}

export default function SealedDeckShop() {
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [images, setImages] = useState<Record<number, string>>({});
  const [revealActive, setRevealActive] = useState(false);

  async function handleBuy() {
    try {
      setLoading(true);
      setRevealActive(false);
      
      const data = await buySealedDeck(Number(id));
      setResult(data);
      
      // Ativa a animação em cascata logo após a renderização dos cards
      setTimeout(() => setRevealActive(true), 50);
    } catch (err) {
      console.error("Failed to buy sealed deck", err);
      alert("Erro ao adquirir o Sealed Deck.");
    } finally {
      setLoading(false);
    }
  }

  /* ================= CARREGAMENTO DE IMAGENS DO DECK ================= */
  useEffect(() => {
    async function loadImages() {
      if (!result?.cards?.length) return;

      const newImages: Record<number, string> = {};

      await Promise.all(
        result.cards.map(async (item: CardItem) => {
          if (!item.card_id) return;
          const url = await getCardImageUrl(item.card_id, "small");
          newImages[item.card_id] = url;
        })
      );

      setImages(newImages);
    }
    loadImages();
  }, [result]);

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes fadeInCard {
          from { opacity: 0; transform: translateY(15px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div style={headerContainer}>
        <BackButton />
        <h1 style={titleStyle}>{result?.title || "Sealed Deck Shop"}</h1>
        <div style={{ width: "40px" }} />
      </div>

      <div style={shopControlCard}>
        <p style={shopDescription}>
          Adquira este deck selado estruturado. Ao comprar, todas as cartas listadas abaixo serão adicionadas diretamente à sua coleção.
        </p>
        <button
          onClick={handleBuy}
          disabled={loading}
          style={{
            ...buttonStyle,
            ...(loading ? buttonDisabled : {}),
          }}
          onMouseEnter={(e) => !loading && (e.currentTarget.style.background = "linear-gradient(135deg, #059669, #047857)")}
          onMouseLeave={(e) => !loading && (e.currentTarget.style.background = "linear-gradient(135deg, #10b981, #059669)")}
        >
          {loading ? "Adquirindo Deck..." : "Comprar Sealed Deck"}
        </button>
      </div>

      {result?.cards && (
        <div style={showcaseArea}>
          <h2 style={revealTitle}>Conteúdo do Deck Adquirido</h2>
          <div style={gridStyle}>
            {result.cards.map((item: CardItem, index: number) => {
              const animatedCardContainer: React.CSSProperties = {
                ...cardContainer,
                opacity: revealActive ? 1 : 0,
                animation: revealActive ? `fadeInCard 0.3s ease forwards` : "none",
                animationDelay: revealActive ? `${index * 50}ms` : "0ms",
              };

              return (
                <div key={item.card_id} style={animatedCardContainer}>
                  <div style={imageWrapper}>
                    <img
                      src={images[item.card_id] || CardImageDefault}
                      style={cardImage}
                      alt="Card Artwork"
                    />
                    
                    <div style={quantityBadgeStyle}>
                      x{item.amount}
                    </div>
                  </div>

                  <div style={infoStyle}>
                    <span style={rarityBadgeStyle}>
                      {item.rarity_code || 'UK'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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

const headerContainer: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  maxWidth: "1100px",
  margin: "0 auto 20px auto",
};

const titleStyle: React.CSSProperties = {
  fontSize: "28px",
  fontWeight: "800",
  margin: 0,
  background: "linear-gradient(90deg, #10b981, #3b82f6)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const shopControlCard: React.CSSProperties = {
  maxWidth: "500px",
  margin: "0 auto 40px auto",
  padding: "24px",
  background: "rgba(255, 255, 255, 0.02)",
  border: "1px solid rgba(255, 255, 255, 0.05)",
  borderRadius: "12px",
  textAlign: "center",
};

const shopDescription: React.CSSProperties = {
  fontSize: "14px",
  color: "#94a3b8",
  margin: "0 0 20px 0",
  lineHeight: "1.5",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 28px",
  fontSize: "15px",
  fontWeight: "700",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
  color: "#fff",
  background: "linear-gradient(135deg, #10b981, #059669)",
  transition: "all 0.2s ease-in-out",
};

const buttonDisabled: React.CSSProperties = {
  opacity: 0.5,
  cursor: "not-allowed",
  background: "#334155",
};

const showcaseArea: React.CSSProperties = {
  maxWidth: "1100px",
  margin: "0 auto",
  borderTop: "1px solid rgba(255,255,255,0.06)",
  paddingTop: "30px",
};

const revealTitle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: "700",
  textAlign: "left",
  marginBottom: "20px",
  color: "#10b981",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
  justifyContent: "center",
  gap: "20px",
};

const cardContainer: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const imageWrapper: React.CSSProperties = {
  position: "relative",
  borderRadius: "10px",
  overflow: "hidden",
  background: "rgba(0,0,0,0.2)",
  lineHeight: 0,
};

const cardImage: React.CSSProperties = {
  width: "170px",
  height: "248px",
  objectFit: "fill",
};

const quantityBadgeStyle: React.CSSProperties = {
  position: "absolute",
  top: "8px",
  right: "8px",
  background: "rgba(15, 23, 42, 0.9)",
  color: "#10b981",
  padding: "4px 8px",
  borderRadius: "6px",
  fontWeight: "800",
  fontSize: "13px",
  border: "1px solid rgba(16, 185, 129, 0.4)",
  boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
};

const infoStyle: React.CSSProperties = {
  marginTop: "10px",
  width: "100%",
  textAlign: "center",
};

const rarityBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: "6px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.08)",
  fontSize: "12px",
  fontWeight: "700",
  color: "#cbd5e1",
};