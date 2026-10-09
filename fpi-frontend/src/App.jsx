// src/App.jsx
import React from "react";
import HeroSection from "./components/HeroSection";
import StateBadge from "./components/StateBadge";
import InfoCards from "./components/InfoCards";
import BenefitList from "./components/BenefitList";
import Simulador from "./components/Simulador";
import FooterNav from "./components/FooterNav";

function App() {
  return (
    <div>
      <HeroSection />
      <section style={{ padding: "2rem", backgroundColor: "var(--color-bg-dark)" }}>
        <StateBadge value="-R$ 2.000" type="deficit" />
      </section>
      <InfoCards />
      <BenefitList />
      <Simulador />
      <FooterNav />
    </div>
  );
}

export default App;
