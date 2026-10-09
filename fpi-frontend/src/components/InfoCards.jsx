import React from "react";
import "./InfoCards.css";

export default function InfoCards() {
  const cards = [
    {
      title: "Cansado de perder para os juros?",
      description: "As dívidas consomem silenciosamente sua margem de manobra financeira. Descubra como estancar a perda de capital.",
      tag: "Dívidas"
    },
    {
      title: "Sem saber por onde começar?",
      description: "Investir não precisa ser um jogo de apostas abstrato. Criamos o caminho lógico da poupança à multiplicação.",
      tag: "Investimentos"
    },
    {
      title: "O dinheiro some antes do fim do mês?",
      description: "Seu Saldo Livre Real mostra exatamente quanto de oxigênio financeiro você tem após todas as obrigações estarem cobertas.",
      tag: "Controle"
    }
  ];

  return (
    <section className="info-cards-section">
      <div className="info-cards-grid">
        {cards.map((card, idx) => (
          <div key={idx} className="info-card">
            <span className="info-card-tag">{card.tag}</span>
            <h3 className="info-card-title">{card.title}</h3>
            <p className="info-card-desc">{card.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
