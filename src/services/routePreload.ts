export const loadControla = () =>
  import('../components/tools/finance/ControlaPage').then((mod) => ({ default: mod.ControlaPage }));
