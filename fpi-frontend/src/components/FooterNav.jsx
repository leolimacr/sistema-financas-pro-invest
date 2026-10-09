import React from "react";
import "./FooterNav.css";

export default function FooterNav() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <span className="footer-logo">FPI</span>
        <div className="footer-links">
          <a href="#about">Filosofia</a>
          <a href="#privacy">Políticas</a>
          <a href="#terms">Termos</a>
        </div>
        <span className="footer-copy">© 2026 Finanças Pro Invest</span>
      </div>
    </footer>
  );
}
