import React from "react";
import "./HeroSection.css";

export default function HeroSection() {
  return (
    <section className="hero-section" aria-labelledby="hero-title">
      <div className="hero-content">
        <h1 id="hero-title" className="hero-title">
          Qual é o preço da sua liberdade?
        </h1>
        <p className="hero-subtitle">
          Descubra seu <strong>Saldo Livre Real</strong>, alcance o <strong>Marco Zero</strong> e tome decisões financeiras com a autoridade de um cockpit de alto desempenho.
        </p>
        <button
          className="hero-cta"
          aria-label="Começar agora – iniciar cadastro"
          onClick={() => {
            console.log("CTA clicado");
          }}
        >
          Começar Agora
        </button>
      </div>
    </section>
  );
}
