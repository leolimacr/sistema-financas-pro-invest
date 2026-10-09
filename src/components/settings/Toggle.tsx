import React from 'react';

interface ToggleProps {
  active: boolean;
  onClick: () => void;
}

export const Toggle: React.FC<ToggleProps> = ({ active, onClick }) => (
  <div
    onClick={onClick}
    className={`w-12 h-7 rounded-full flex items-center px-1 transition-colors duration-300 cursor-pointer ${
      active ? 'bg-emerald-600' : 'bg-slate-300'
    }`}
  >
    <div
      className={`w-5 h-5 bg-white rounded-full shadow-lg transform transition-transform duration-300 ${
        active ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </div>
);

export default Toggle;
