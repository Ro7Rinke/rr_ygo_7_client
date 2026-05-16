import { useState, useMemo, useEffect } from "react";
import { buyBooster } from "../../services/booster";
import { useParams } from "react-router-dom";
import { getCardImageUrl, CardImageDefault } from "../../utils/common";
import BackButton from "../../components/BackButton";

const rarityMap: Record<number, string> = {
  10: "N",
  20: "R",
  30: "SR",
  40: "UR",
  50: "SC",
};

export default function BoosterShop() {
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [images, setImages] = useState<Record<number, string>>({});

  async function handleBuy() {
    try {
      setLoading(true);
      const data = await buyBooster(Number(id));
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  const slots = useMemo(() => {
    if (!result?.results) return [];

    return [...result.results].sort(
      (a: any, b: any) => a.slot - b.slot
    );
  }, [result]);

  /* ================= LOAD IMAGES ================= */

  useEffect(() => {
    async function loadImages() {
      if (!slots.length) return;

      const newImages: Record<number, string> = {};

      await Promise.all(
        slots.map(async (item: any) => {
          if (!item?.card_id) return;

          const url = await getCardImageUrl(item.card_id, "small");
          newImages[item.slot] = url;
        })
      );

      setImages(newImages);
    }

    loadImages();
  }, [slots]);

  return (
    <div style={containerStyle}>
      <BackButton />

      <h1 style={titleStyle}>
        {result?.booster || "Booster Shop"}
      </h1>

      <button
        onClick={handleBuy}
        disabled={loading}
        style={{
          ...buttonStyle,
          ...(loading ? buttonDisabled : {}),
        }}
        onMouseEnter={(e) =>
          !loading && (e.currentTarget.style.transform = "scale(1.05)")
        }
        onMouseLeave={(e) =>
          !loading && (e.currentTarget.style.transform = "scale(1)")
        }
        onMouseDown={(e) =>
          !loading && (e.currentTarget.style.transform = "scale(0.95)")
        }
        onMouseUp={(e) =>
          !loading && (e.currentTarget.style.transform = "scale(1.05)")
        }
      >
        {loading ? "Opening..." : "Buy Booster"}
      </button>

      {result && (
        <div style={gridStyle}>
          {slots.map((item: any) => {
            const hasCard = item?.card_id;

            return (
              <div key={item.slot} style={cardContainer}>
                <img
                  src={
                    hasCard
                      ? images[item.slot] || CardImageDefault
                      : CardImageDefault
                  }
                  style={cardImage}
                />

                <div style={infoStyle}>
                  {hasCard ? (
                    <span>
                      {rarityMap[item.rarity_id] ||
                        item.rarity_id}
                    </span>
                  ) : item?.refunded ? (
                    <span>💰 +{item.refunded}</span>
                  ) : (
                    <span>EMPTY</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */

const containerStyle: React.CSSProperties = {
  padding: "30px 20px",
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

const buttonStyle: React.CSSProperties = {
  marginBottom: "20px",
  padding: "12px 24px",
  fontSize: "16px",
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

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, 179px)",
  justifyContent: "center",
  gap: "16px",
  marginTop: "30px",
};

const cardContainer: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const cardImage: React.CSSProperties = {
  width: "179px",
  height: "261px",
  objectFit: "fill",
  borderRadius: "8px",
  boxShadow: "0 6px 16px rgba(0,0,0,0.5)",
};

const infoStyle: React.CSSProperties = {
  marginTop: "8px",
  fontWeight: "bold",
  fontSize: "14px",
};