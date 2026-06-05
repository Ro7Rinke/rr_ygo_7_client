import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import CreateBooster from "./pages/boosters/CreateBooster.tsx";
import BuyBooster from "./pages/boosters/BuyBooster.tsx";
import ListBoosters from "./pages/boosters/ListBooster.tsx";
import AdminActivation from "./pages/boosters/AdminActivation.tsx";
import BuySealedDeck from "./pages/boosters/BuySealedDeck.tsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/booster/create-booster" element={<CreateBooster />} />
      <Route path="/booster/buy-booster/:id" element={<BuyBooster />} />
      <Route path="/booster/buy-sealed-deck/:id" element={<BuySealedDeck />} />
      <Route path="/booster/list-boosters" element={<ListBoosters />} />
      <Route path="/booster/admin-activation" element={<AdminActivation />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}