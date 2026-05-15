import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getBoosters } from "../../services/booster";
import type { Booster } from "../../types/Booster";
import BackButton from "../../components/BackButton";

export default function ListBoosters() {
  const [boosters, setBoosters] = useState<Booster[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getBoosters();
        setBoosters(data);
      } catch (err) {
        console.error("Failed to load boosters", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <div style={containerStyle}>
        <p>Loading boosters...</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <BackButton />
      <h1 style={titleStyle}>Boosters</h1>

      {boosters.length === 0 && <p>No boosters found.</p>}

      <div style={gridStyle}>
        {boosters.map((b) => (
          <div key={b.id} style={cardStyle}>
            <h2 style={cardTitle}>{b.title}</h2>

            <p>
              <strong>Code:</strong> {b.code}
            </p>

            <p>
              <strong>Price:</strong> {b.price}
            </p>

            <p>
              <strong>Cards per pack:</strong> {b.cards_per_pack}
            </p>

            <button
              style={buttonStyle}
              onClick={() => navigate(`/booster/buy-booster/${b.id}`)}
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
              Open / Buy
            </button>
          </div>
        ))}
      </div>
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

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
  gap: "16px",
  marginTop: "20px",
};

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  borderRadius: "12px",
  padding: "16px",
  backdropFilter: "blur(6px)",
  boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
  textAlign: "left",
  transition: "transform 0.2s ease",
};

const cardTitle: React.CSSProperties = {
  marginBottom: "10px",
  fontSize: "20px",
  fontWeight: "700",
};

const buttonStyle: React.CSSProperties = {
  marginTop: "12px",
  width: "100%",
  padding: "10px",
  fontSize: "14px",
  fontWeight: "700",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
  color: "#fff",
  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
  boxShadow: "0 4px 12px rgba(99,102,241,0.5)",
  transition: "all 0.2s ease",
};