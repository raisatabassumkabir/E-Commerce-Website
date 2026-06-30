import React from 'react';

const StatusBadge = ({ status }) => {
  const getStyles = () => {
    switch (status?.toUpperCase()) {
      case 'PENDING': return 'bg-amber-100/50 text-amber-700 border-amber-200';
      case 'PROCESSING': return 'bg-blue-100/50 text-blue-700 border-blue-200';
      case 'SHIPPED': return 'bg-purple-100/50 text-purple-700 border-purple-200';
      case 'DELIVERED': return 'bg-emerald-100/50 text-emerald-700 border-emerald-200';
      case 'CANCELLED': return 'bg-red-100/50 text-red-700 border-red-200';
      default: return 'bg-neutral-100 text-neutral-600 border-neutral-200';
    }
  };

  return (
    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${getStyles()}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
