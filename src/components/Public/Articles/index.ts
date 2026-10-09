// src/components/Public/Articles/index.ts
import { InvestmentArticle2026, metadata as meta2026 } from './InvestmentArticle2026';

export const articles = [
  {
    ...meta2026,
    component: InvestmentArticle2026
  }
];

// Opcional: função para buscar artigo por ID
export const getArticleById = (id: string) => 
  articles.find(article => article.id === id);