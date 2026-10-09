import React from "react";
import "./BenefitList.css";

export default function BenefitList() {
  const benefits = [
    {
      title: "Visibilidade em cockpit",
      description: "Uma tela única que não mascara a realidade. Entenda a saúde das suas contas sem rodeios."
    },
    {
      title: "Decisões baseadas em dados",
      description: "Esqueça palpites. Saiba com precisão cirúrgica o impacto de cada movimentação no seu patrimônio."
    },
    {
      title: "O Nexus ao seu lado",
      description: "Um conselheiro estratégico inteligente e silencioso que prevê tendências e te alerta antes de qualquer desvio de rota."
    }
  ];

  return (
    <section className="benefits-section">
      <div className="benefits-container">
        <h2 className="benefits-section-title">A soberania financeira exige clareza</h2>
        <div className="benefits-grid">
          {benefits.map((benefit, idx) => (
            <div key={idx} className="benefit-item">
              <div className="benefit-icon-wrapper">
                <span className="benefit-number">0{idx + 1}</span>
              </div>
              <div className="benefit-content">
                <h3 className="benefit-title">{benefit.title}</h3>
                <p className="benefit-desc">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
