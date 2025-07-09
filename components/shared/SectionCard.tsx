
import React from 'react';

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, children }) => {
  return (
    <div className="bg-white shadow-xl rounded-lg p-6 mb-8">
      <h2 className="text-2xl font-semibold text-slate-700 mb-6 border-b pb-3">{title}</h2>
      {children}
    </div>
  );
};

export default SectionCard;
