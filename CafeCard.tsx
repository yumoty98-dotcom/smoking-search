
import React from 'react';

interface CafeCardProps {
  name: string;
  description: string;
  station?: string;
  address?: string;
  smokingType?: string;
  isFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
  onClick: () => void;
}

export const CafeCard: React.FC<CafeCardProps> = ({ 
  name, 
  description, 
  station, 
  address, 
  smokingType, 
  isFavorite,
  onToggleFavorite,
  onClick 
}) => {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4 cursor-pointer hover:shadow-md transition-shadow group relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-2 pr-8">
        <h3 className="text-lg font-black text-gray-900 group-hover:text-orange-600 transition-colors leading-tight">{name}</h3>
        {smokingType && (
          <span className="flex-shrink-0 bg-orange-50 text-orange-600 text-[9px] px-2 py-1 rounded-md font-black border border-orange-100 uppercase">
            {smokingType}
          </span>
        )}
      </div>

      {/* お気に入りボタン */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite?.(e);
        }}
        className="absolute top-4 right-4 p-2 transition-transform active:scale-125 z-10"
      >
        <svg 
          className={`w-6 h-6 ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-300'}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>

      <div className="flex flex-wrap gap-2 mb-3">
        {station && (
          <div className="text-[10px] text-gray-500 font-bold flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md">
            <span>🚉</span> {station}
          </div>
        )}
        {address && (
          <div className="text-[10px] text-gray-500 font-bold flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md">
            <span>📍</span> {address}
          </div>
        )}
      </div>
      <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed font-medium">
        {description}
      </p>
    </div>
  );
};
