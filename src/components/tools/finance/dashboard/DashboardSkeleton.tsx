import React from 'react';

const DashboardSkeleton: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pt-14 md:pt-6 pb-32 space-y-8 animate-in fade-in duration-500 bg-surface-secondary dark:bg-slate-900 rounded-5xl border border-surface-elevated dark:border-slate-800 shadow-card">
      {/* OPT 4: Enhanced Skeleton - Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
          <div className="space-y-2">
            <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-10 h-10 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          <div className="w-10 h-10 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          <div className="w-32 h-10 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        </div>
      </div>

      {/* Skeleton Balance Card */}
      <div className="bg-surface-primary dark:bg-slate-800/80 border border-surface-elevated dark:border-slate-700 rounded-4xl p-8 shadow-soft flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
          <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-8 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="flex gap-8">
          <div className="h-10 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-10 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
        </div>
      </div>

      {/* Skeleton Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="h-64 bg-surface-primary dark:bg-slate-800 border border-surface-elevated dark:border-slate-700 rounded-5xl animate-pulse" />
         <div className="h-64 bg-surface-primary dark:bg-slate-800 border border-surface-elevated dark:border-slate-700 rounded-5xl animate-pulse" />
      </div>
    </div>
  );
};

export default DashboardSkeleton;
