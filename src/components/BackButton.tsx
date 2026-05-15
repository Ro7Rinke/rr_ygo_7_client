import { useNavigate } from "react-router-dom";

type Props = {
  fallback?: string;
  label?: string;
  style?: React.CSSProperties;
};

export default function BackButton({
  fallback = "/dashboard",
  label = "← Voltar",
  style = {},
}: Props) {
  const navigate = useNavigate();

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  }

  return (
    <button
      onClick={handleBack}
      style={{
        ...buttonStyle,
        ...style,
      }}
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
      {label}
    </button>
  );
}

/* ================= STYLE ================= */

// const buttonStyle: React.CSSProperties = {
//   padding: "10px 16px",
//   fontSize: "14px",
//   fontWeight: "700",
//   borderRadius: "10px",
//   border: "none",
//   cursor: "pointer",
//   color: "#fff",
//   background: "linear-gradient(135deg, #6366f1, #4f46e5)",
//   boxShadow: "0 4px 12px rgba(99,102,241,0.5)",
//   transition: "all 0.2s ease",
// };


const buttonStyle: React.CSSProperties = {
  padding: "10px 16px",
  fontSize: "14px",
  fontWeight: "700",
  borderRadius: "10px",
  border: "none",
  cursor: "pointer",
  color: "#fff",
  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
  boxShadow: "0 4px 12px rgba(99,102,241,0.5)",
  transition: "all 0.2s ease",

  display: "block",
  marginRight: "auto",
};