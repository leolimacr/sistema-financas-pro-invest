export const formatNumber = (val: number, decimals: number) => {
    return new Intl.NumberFormat('pt-BR', { 
        minimumFractionDigits: decimals, 
        maximumFractionDigits: decimals 
    }).format(val);
};

export const getDisplayPrice = (type: string, symbol: string, rawPrice: any) => {
    if (!rawPrice || rawPrice === 0 || rawPrice === '---') return '---';
    const val = parseFloat(rawPrice);

    // 1. ÍNDICES (Ex: 120.000 Pts)
    if (type === 'index' || symbol.includes('IBOV') || symbol.includes('S&P')) {
        return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(val)} Pts`;
    }

    // 2. INDICADORES (Ex: 11.25%)
    if (type === 'indicator') {
        const strPrice = String(rawPrice);
        return strPrice.includes('%') ? strPrice : `${strPrice}%`;
    }

    // 3. MOEDAS (Dólar/Euro - 2 casas decimais padrão BRL)
    if (type === 'currency' || symbol === 'USD' || symbol === 'EUR' || symbol.includes('BRL')) {
        return `R$ ${formatNumber(val, 2)}`;
    }

    // 4. CRIPTO (US$ para pares USD, R$ para BRL)
    if (type === 'crypto') {
        if (symbol.includes('USD')) {
            return `US$ ${formatNumber(val, 2)}`;
        }
        return `R$ ${formatNumber(val, 2)}`;
    }

    // 5. AÇÕES E OUTROS (R$ 1.000,00)
    return `R$ ${formatNumber(val, 2)}`;
};