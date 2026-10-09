import React, { useState } from "react";
import "./Simulador.css";

export default function Simulador() {
  const [val, setVal] = useState(500);
  const [time, setTime] = useState(12);
  
  // Basic mock compound/repayment calculation
  const calculatedSavings = Math.round(val * time * 1.08);

  return (
    <section className="simulador-section">
      <div className="simulador-container">
        <div className="simulador-info">
          <h2 className="simulador-title">Qual o preço da sua autonomia?</h2>
          <p className="simulador-desc">
            Simule o impacto de direcionar pequenas quantias mensais do seu Saldo Livre para a construção patrimonial ou amortização de débitos estruturados.
          </p>
        </div>
        
        <div className="simulador-card">
          <div className="simulador-inputs">
            <div className="simulador-input-group">
              <label>Aporte Mensal (R$): {val}</label>
              <input 
                type="range" 
                min="100" 
                max="5000" 
                step="100" 
                value={val} 
                onChange={(e) => setVal(Number(e.target.value))} 
              />
            </div>
            
            <div className="simulador-input-group">
              <label>Tempo de Projeção (Meses): {time}</label>
              <input 
                type="range" 
                min="6" 
                max="60" 
                step="6" 
                value={time} 
                onChange={(e) => setTime(Number(e.target.value))} 
              />
            </div>
          </div>
          
          <div className="simulador-result">
            <span className="result-label">Resultado Estimado</span>
            <span className="result-value">R$ {calculatedSavings.toLocaleString("pt-BR")}</span>
            <span className="result-notice">Considerando simulação conservadora baseada em juros de mercado.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
