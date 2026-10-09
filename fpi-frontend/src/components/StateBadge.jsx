import React from "react";
import "./StateBadge.css";

export default function StateBadge({ value, type }) {
  const isDeficit = type === "deficit";
  
  return (
    <div className={`state-badge ${type}`} role="status">
      <span className="state-badge-label">
        {isDeficit ? "Déficit de Liberdade Real" : "Soberania Patrimonial"}
      </span>
      <span className="state-badge-value">{value}</span>
      <span className="state-badge-description">
        {isDeficit 
          ? "Você está operando abaixo da sua linha de segurança financeira (Marco Zero)." 
          : "Seu saldo livre está positivo e protegido contra imprevistos."}
      </span>
    </div>
  );
}
