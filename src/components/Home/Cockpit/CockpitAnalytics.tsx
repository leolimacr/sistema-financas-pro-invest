import FeatureGate from '../../FeatureGate';
import { LineChart as LineChartIcon, ShieldCheck, AlertCircle, TrendingUp, Building2, Target } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { FPI_COPY } from '../../../theme/fpiVoiceGuide';
import { useTheme } from '../../../contexts/ThemeContext';

interface EvolutionPoint {
  name: string;
  fullDate: string;
  value: number;
  investments: number;
  debts: number;
}

interface CompositionSlice {
  name?: string;
  value: number;
}

interface CockpitAnalyticsProps {
  evolutionData: EvolutionPoint[];
  investmentComposition: CompositionSlice[];
  propertyComposition: CompositionSlice[];
  debtComposition: CompositionSlice[];
  isPrivacyMode: boolean;
  validatedModules: { investments?: boolean; debts?: boolean; property?: boolean } | null;
  totalInvestments: number;
  totalProperty: number;
  totalDebts: number;
  onNavigate: (tool: string) => void;
  formatCurrency: (val: number) => string;
}

const CockpitAnalytics: React.FC<CockpitAnalyticsProps> = ({
  evolutionData,
  investmentComposition,
  propertyComposition,
  debtComposition,
  isPrivacyMode,
  validatedModules,
  totalInvestments,
  totalProperty,
  totalDebts,
  onNavigate,
  formatCurrency,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div className="space-y-6">
      {/* EVOLUÇÃO PATRIMONIAL */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-section p-6 md:p-8 overflow-hidden group relative">
        {/* Imagem Lifestyle Future Horizon - Sutil e Elegante */}
        <div className="absolute right-0 top-0 w-64 h-full opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none z-0">
          <img 
            src="/assets/images/lifestyle/future-horizon.webp" 
            alt="Horizonte de Futuro" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-white dark:to-slate-900" />
        </div>

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl text-emerald-700 dark:text-emerald-400">
                <LineChartIcon size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight uppercase">Evolução do Patrimônio Líquido</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{FPI_COPY.patrimonyEvolutionSubtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {validatedModules?.investments && validatedModules?.debts && validatedModules?.property ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-800/50 text-[10px] font-black uppercase tracking-widest">
                  <ShieldCheck size={14} />
                  Dados Consolidados
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-surface-subtle dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest">
                  <AlertCircle size={14} />
                  Validação Pendente
                </div>
              )}
            </div>
          </div>

          {/* E7-04: gráfico de evolução é Pro — free vê o upsell (fallback). */}
          <FeatureGate
            featureKey="historical_evolution"
            fallback={
              <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-center">
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">A evolução histórica é exclusiva Pro.</p>
                <button onClick={() => onNavigate('pricing')} className="mt-2 text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest hover:underline">Fazer Upgrade →</button>
              </div>
            }
          >
          <div className="relative h-[500px] w-full bg-surface-subtle dark:bg-slate-900/60 rounded-3xl p-4 border border-slate-200 dark:border-slate-800">
            {evolutionData.length > 0 && (
              <svg viewBox="0 0 1000 500" className="w-full h-full overflow-visible">
                <defs>
                  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity={isDark ? 0.35 : 0.1} />
                  </filter>
                </defs>

                {(() => {
                  const padding = { top: 120, right: 80, bottom: 60, left: 80 };
                  const width = 1000 - padding.left - padding.right;
                  const height = 500 - padding.top - padding.bottom;
                  
                  const allValues = evolutionData.flatMap(d => [d.value, d.investments, d.debts]);
                  const minVal = Math.min(...allValues, 0) * 0.9;
                  const maxVal = Math.max(...allValues, 1000) * 1.2;
                  const range = maxVal - minVal;

                  const getY = (val: number) => padding.top + height - ((val - minVal) / range) * height;
                  const getX = (index: number) => {
                    if (evolutionData.length <= 1) return 1000 / 2;
                    return padding.left + (index * (width / (evolutionData.length - 1)));
                  };

                  const points = evolutionData.map((d, i) => ({
                    x: getX(i),
                    plY: getY(d.value),
                    invY: getY(d.investments),
                    debY: getY(d.debts),
                    data: d
                  }));

                  return (
                    <g>
                      {[0, 0.25, 0.5, 0.75, 1].map(p => (
                        <line key={p} x1={padding.left} y1={padding.top + height * p} x2={padding.left + width} y2={padding.top + height * p} stroke={isDark ? '#334155' : '#e2e8f0'} strokeDasharray="4 4" />
                      ))}

                      {evolutionData.length > 1 && (
                        <>
                          <path d={`M ${points[0].x} ${padding.top + height} ${points.map(p => `L ${p.x} ${p.plY}`).join(' ')} L ${points[points.length-1].x} ${padding.top + height} Z`} fill="#10b981" fillOpacity={isDark ? 0.15 : 0.1} />
                          <path d={`M ${points.map(p => `${p.x} ${p.plY}`).join(' L ')}`} fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                          <path d={`M ${points[0].x} ${padding.top + height} ${points.map(p => `L ${p.x} ${p.invY}`).join(' ')} L ${points[points.length-1].x} ${padding.top + height} Z`} fill="#f59e0b" fillOpacity={isDark ? 0.1 : 0.05} />
                          <path d={`M ${points.map(p => `${p.x} ${p.invY}`).join(' L ')}`} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 4" />
                          <path d={`M ${points[0].x} ${padding.top + height} ${points.map(p => `L ${p.x} ${p.debY}`).join(' ')} L ${points[points.length-1].x} ${padding.top + height} Z`} fill="#f43f5e" fillOpacity={isDark ? 0.1 : 0.05} />
                          <path d={`M ${points.map(p => `${p.x} ${p.debY}`).join(' L ')}`} fill="none" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 4" />
                        </>
                      )}

                      {points.map((p, i) => (
                        <g key={i}>
                          <circle cx={p.x} cy={p.plY} r="6" fill="#10b981" stroke={isDark ? '#0f172a' : 'white'} strokeWidth="3" />
                          <circle cx={p.x} cy={p.invY} r="4" fill="#f59e0b" stroke={isDark ? '#0f172a' : 'white'} strokeWidth="2" />
                          <circle cx={p.x} cy={p.debY} r="4" fill="#f43f5e" stroke={isDark ? '#0f172a' : 'white'} strokeWidth="2" />

                          <g transform={`translate(${p.x},${Math.min(p.plY, p.invY, p.debY) - 20})`}>
                            <rect x="-55" y="-85" width="110" height="75" fill={isDark ? '#1e293b' : 'white'} rx="12" filter="url(#shadow)" stroke={isDark ? '#475569' : '#cbd5e1'} strokeWidth="1" />
                            <text x="0" y="-65" textAnchor="middle" fontSize="12" fontWeight="900" fill="#10b981">{isPrivacyMode ? '•••' : formatCurrency(p.data.value)}</text>
                            <text x="0" y="-50" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#f59e0b">Inv: {isPrivacyMode ? '•••' : formatCurrency(p.data.investments)}</text>
                            <text x="0" y="-38" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#f43f5e">Dív: {isPrivacyMode ? '•••' : formatCurrency(p.data.debts)}</text>
                            <rect x="-30" y="-28" width="60" height="14" rx="4" fill={isDark ? '#0f172a' : '#f8fafc'} />
                            <text x="0" y="-18" textAnchor="middle" fontSize="9" fontWeight="900" fill={isDark ? '#94a3b8' : '#64748b'}>{p.data.fullDate}</text>
                            <line x1="0" y1="-5" x2="0" y2="15" stroke={isDark ? '#475569' : '#cbd5e1'} strokeWidth="1" strokeDasharray="2 2" />
                          </g>
                           <text x={p.x} y={padding.top + height + 25} textAnchor="middle" fontSize="10" fontWeight="bold" fill={isDark ? '#94a3b8' : '#475569'}>{p.data.name}</text>
                        </g>
                      ))}
                    </g>
                  );
                })()}
              </svg>
            )}
          </div>
          </FeatureGate>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COMPOSIÇÃO DE INVESTIMENTOS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-section p-6 md:p-8 overflow-hidden group">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl"><TrendingUp size={22} /></div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight uppercase">Sua Carteira</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Diversificação por categoria.</p>
            </div>
          </div>
          <div className="h-64 w-full">
            {investmentComposition.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={investmentComposition} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {investmentComposition.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'][index % 6]} stroke={isDark ? '#0f172a' : '#ffffff'} strokeWidth={1} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '1rem', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)', background: isDark ? '#0f172a' : '#fff', color: isDark ? '#f8fafc' : '#0f172a', fontSize: '11px' }} formatter={(val: number) => [isPrivacyMode ? '•••' : formatCurrency(val), 'Total']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 w-full">
                <div className="p-4 bg-surface-subtle dark:bg-slate-800 rounded-full"><Target size={32} className="text-slate-400" /></div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Nenhum investimento <br/> cadastrado</p>
              </div>
            )}
          </div>
          {investmentComposition.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex flex-col gap-2 mb-4">
                {investmentComposition.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'][index % 6] }} />
                      <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-900 dark:text-white">{isPrivacyMode ? '•••' : formatCurrency(item.value)}</span>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{((item.value / totalInvestments) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* COMPOSIÇÃO DE BENS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-section p-6 md:p-8 overflow-hidden group">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 rounded-2xl"><Building2 size={22} /></div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight uppercase">Bens</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Patrimônio físico.</p>
            </div>
          </div>
          <div className="h-64 w-full">
            {propertyComposition.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={propertyComposition} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {propertyComposition.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['#0ea5e9', '#8b5cf6', '#f43f5e', '#f59e0b', '#10b981', '#6366f1'][index % 6]} stroke={isDark ? '#0f172a' : '#ffffff'} strokeWidth={1} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '1rem', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)', background: isDark ? '#0f172a' : '#fff', color: isDark ? '#f8fafc' : '#0f172a', fontSize: '11px' }} formatter={(val: number) => [isPrivacyMode ? '•••' : formatCurrency(val), 'Total']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 w-full">
                <div className="p-4 bg-surface-subtle dark:bg-slate-800 rounded-full"><Target size={32} className="text-slate-400" /></div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Nenhum bem <br/> cadastrado</p>
              </div>
            )}
          </div>
          {propertyComposition.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex flex-col gap-2 mb-4">
                {propertyComposition.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#0ea5e9', '#8b5cf6', '#f43f5e', '#f59e0b', '#10b981', '#6366f1'][index % 6] }} />
                      <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-900 dark:text-white">{isPrivacyMode ? '•••' : formatCurrency(item.value)}</span>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{((item.value / totalProperty) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* COMPOSIÇÃO DE DÍVIDAS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-section p-6 md:p-8 overflow-hidden group">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl"><AlertCircle size={22} /></div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight uppercase">Débitos</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Distribuição de dívidas.</p>
            </div>
          </div>
          <div className="h-64 w-full">
            {debtComposition.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={debtComposition} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {debtComposition.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['#f43f5e', '#f59e0b', '#8b5cf6', '#6366f1', '#0ea5e9', '#10b981'][index % 6]} stroke={isDark ? '#0f172a' : '#ffffff'} strokeWidth={1} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '1rem', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)', background: isDark ? '#0f172a' : '#fff', color: isDark ? '#f8fafc' : '#0f172a', fontSize: '11px' }} formatter={(val: number) => [isPrivacyMode ? '•••' : formatCurrency(val), 'Total']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">{FPI_COPY.noDebtsTitle}</p>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 px-4">{FPI_COPY.noDebtsBody}</p>
              </div>
            )}
          </div>
          {debtComposition.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex flex-col gap-2 mb-4">
                {debtComposition.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#f43f5e', '#f59e0b', '#8b5cf6', '#6366f1', '#0ea5e9', '#10b981'][index % 6] }} />
                      <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-900 dark:text-white">{isPrivacyMode ? '•••' : formatCurrency(item.value)}</span>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{((item.value / totalDebts) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CockpitAnalytics;
