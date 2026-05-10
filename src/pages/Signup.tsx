import { useState } from "react";
import { signup } from "../services/auth";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const navigate = useNavigate();

  async function handleSignup() {
    try {
      await signup(email, password, nickname);
      alert("Conta criada!");
      navigate("/");
    } catch (e){
        console.log(e)
      alert("Erro no cadastro");
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Signup</h1>

      <input placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
      <br />
      <input placeholder="Nickname" onChange={(e) => setNickname(e.target.value)} />
      <br />
      <input type="password" placeholder="Senha" onChange={(e) => setPassword(e.target.value)} />
      <br />

      <button onClick={handleSignup}>Criar conta</button>
    </div>
  );
}