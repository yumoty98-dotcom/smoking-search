
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { searchEstablishmentsWithGemini } from './services/geminiService';
import { Location, SmokingType, EstablishmentCategory } from './types';
import { CafeCard } from './components/CafeCard';
import { CafeDetailModal } from './components/CafeDetailModal';

type ViewMode = 'list' | 'map' | 'favorites';

declare global {
  const L: any;
}

const SMOKING_FILTERS: { label: string; value: SmokingType; emoji: string }[] = [
  { label: '店内喫煙', value: '店内喫煙可', emoji: '🪑' },
  { label: '喫煙室あり', value: '喫煙室あり', emoji: '🚪' },
  { label: '屋外・テラス', value: '屋外・テラスのみ', emoji: '🌳' },
];

const QUICK_SEARCH_TAGS = [
  { name: '新宿', icon: '🏙️' },
  { name: '新橋', icon: '💼' },
  { name: '上野', icon: '🐼' },
  { name: '渋谷', icon: '🐕' },
  { name: '秋葉原', icon: '🎮' },
];

const CATEGORIES: { label: string; value: EstablishmentCategory; icon: string }[] = [
  { label: 'すべて', value: '飲食店すべて', icon: '🍴' },
  { label: 'カフェ', value: 'カフェ', icon: '☕' },
  { label: '居酒屋', value: '居酒屋', icon: '🍺' },
  { label: 'ラーメン', value: 'ラーメン', icon: '🍜' },
  { label: '焼肉', value: '焼肉', icon: '🥩' },
  { label: 'バー', value: 'バー', icon: '🍸' },
];

const App: React.FC = () => {
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<EstablishmentCategory>('飲食店すべて');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cafes, setCafes] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [activeSmokingFilters, setActiveSmokingFilters] = useState<SmokingType[]>([]);
  const [selectedCafe, setSelectedCafe] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // お気に入りの読み込み
  useEffect(() => {
    const saved = localStorage.getItem('smoking_finder_favorites');
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse favorites", e);
      }
    }
  }, []);

  // お気に入りの保存
  useEffect(() => {
    localStorage.setItem('smoking_finder_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const filteredCafes = useMemo(() => {
    const list = viewMode === 'favorites' ? favorites : cafes;
    if (activeSmokingFilters.length === 0) return list;
    return list.filter(cafe => activeSmokingFilters.includes(cafe.smokingType));
  }, [cafes, favorites, activeSmokingFilters, viewMode]);

  const toggleFavorite = useCallback((cafe: any) => {
    setFavorites(prev => {
      const isFav = prev.some(f => f.name === cafe.name && f.address === cafe.address);
      if (isFav) {
        return prev.filter(f => !(f.name === cafe.name && f.address === cafe.address));
      } else {
        return [...prev, cafe];
      }
    });
  }, []);

  const isFavorite = useCallback((cafe: any) => {
    return favorites.some(f => f.name === cafe.name && f.address === cafe.address);
  }, [favorites]);

  // 現在地の取得
  const getCurrentLocation = useCallback(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(loc);
          if (leafletMapRef.current) {
            leafletMapRef.current.setView([loc.lat, loc.lng], 15);
          }
        },
        () => console.log("Location access denied"),
        { timeout: 5000 }
      );
    }
  }, []);

  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  const initMap = useCallback(() => {
    if (!mapContainerRef.current || leafletMapRef.current) return;
    
    const initialPos = userLocation ? [userLocation.lat, userLocation.lng] : [35.6812, 139.7671];
    
    leafletMapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false
    }).setView(initialPos, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(leafletMapRef.current);

    markersLayerRef.current = L.layerGroup().addTo(leafletMapRef.current);
    
    L.control.zoom({
      position: 'topright'
    }).addTo(leafletMapRef.current);
  }, [userLocation]);

  useEffect(() => {
    if (viewMode === 'map') {
      const timer = setTimeout(() => {
        initMap();
        leafletMapRef.current?.invalidateSize();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [viewMode, initMap]);

  const updateMarkers = useCallback(() => {
    if (!leafletMapRef.current || !markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();
    if (filteredCafes.length === 0) return;

    const group = [];
    filteredCafes.forEach((cafe) => {
      if (cafe.lat && cafe.lng) {
        const marker = L.circleMarker([cafe.lat, cafe.lng], {
          radius: 12,
          fillColor: isFavorite(cafe) ? "#ef4444" : "#ea580c",
          color: "#fff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
        });

        const routeUrl = `https://www.google.com/maps/dir/?api=1&destination=${cafe.lat},${cafe.lng}`;
        
        const popupContent = `
          <div style="font-family: sans-serif; padding: 5px; min-width: 180px;">
            <div style="font-weight: 900; font-size: 15px; margin-bottom: 4px; color: #111827;">${cafe.name} ${isFavorite(cafe) ? '❤️' : ''}</div>
            <div style="font-size: 11px; color: #ea580c; font-weight: bold; margin-bottom: 8px;">${cafe.smokingType}</div>
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 10px;">${cafe.address || ''}</div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <a href="${routeUrl}" target="_blank" rel="noopener noreferrer" style="background: #2563eb; color: white; text-decoration: none; text-align: center; padding: 8px; border-radius: 8px; font-size: 12px; font-weight: bold;">Googleマップでルート検索</a>
              <button id="p-${cafe.id}" style="background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; padding: 8px; border-radius: 8px; font-size: 12px; font-weight: bold; cursor: pointer;">詳細データ</button>
            </div>
          </div>
        `;
        
        marker.bindPopup(popupContent);
        marker.on('popupopen', () => {
          document.getElementById(`p-${cafe.id}`)?.addEventListener('click', () => openDetail(cafe));
        });

        markersLayerRef.current.addLayer(marker);
        group.push([cafe.lat, cafe.lng]);
      }
    });

    if (group.length > 0 && filteredCafes.length > 0 && viewMode === 'map') {
      leafletMapRef.current.fitBounds(group, { padding: [50, 50], maxZoom: 16 });
    }
  }, [filteredCafes, isFavorite, viewMode]);

  useEffect(() => {
    if (viewMode === 'map') updateMarkers();
  }, [filteredCafes, viewMode, updateMarkers]);

  const handleSearch = useCallback(async (customTerm?: string) => {
    const targetTerm = customTerm || searchTerm;
    if (!targetTerm.trim() && !userLocation) {
      setError("場所を入力してください");
      inputRef.current?.focus();
      return;
    }

    if (customTerm) setSearchTerm(customTerm);
    setLoading(true);
    setError(null);
    setCafes([]);
    setActiveSmokingFilters([]);
    setViewMode('list');

    try {
      const result = await searchEstablishmentsWithGemini(userLocation, selectedCategory, targetTerm);
      
      if (result.text.includes("明確な記載が見当たりませんでした")) {
        setError("調査範囲では明確な記載が見当たりませんでした。別の駅名などを試してください。");
        setLoading(false);
        return;
      }

      const blocks = result.text.split(/(?=店舗名[:：])/g).filter(b => b.trim().length > 20);
      
      const parsed = blocks.map((block, i) => {
        const getValue = (label: string) => {
          const regex = new RegExp(`${label}[:：]\\s*(.*?)(\\n|$)`, 'i');
          const match = block.match(regex);
          return match ? match[1].trim() : "";
        };

        const latMatch = block.match(/lat[:\s]+([\d.]+)/i);
        const lngMatch = block.match(/lng[:\s]+([\d.]+)/i);

        let smokingType: SmokingType = '不明';
        const typeStr = getValue("喫煙タイプ");
        if (typeStr.includes("店内")) smokingType = '店内喫煙可';
        else if (typeStr.includes("喫煙室")) smokingType = '喫煙室あり';
        else if (typeStr.includes("屋外") || typeStr.includes("テラス")) smokingType = '屋外・テラスのみ';

        return {
          id: `cafe-${i}-${Date.now()}`,
          name: getValue("店舗名").replace(/^[・\d.\s]+/, ''),
          station: getValue("エリア／駅名") || getValue("最寄り駅"),
          address: getValue("住所"),
          smokingType: smokingType,
          description: getValue("喫煙に関する記載の要約") || getValue("喫煙の根拠") || block,
          notes: getValue("補足") || getValue("補足（分煙、時間制限など）"),
          lat: latMatch ? parseFloat(latMatch[1]) : null,
          lng: lngMatch ? parseFloat(lngMatch[1]) : null,
          reliability: getValue("信頼度"),
          mapUrl: getValue("GoogleマップURL") || result.groundingChunks[i]?.maps?.uri
        };
      }).filter(c => c.name && c.smokingType !== '不明');

      if (parsed.length === 0) {
        setError("喫煙に関する推論情報が見つかりませんでした。");
      } else {
        setCafes(parsed);
      }
    } catch (err) {
      setError("検索中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }, [userLocation, searchTerm, selectedCategory]);

  const toggleFilter = (type: SmokingType) => {
    setActiveSmokingFilters(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const openDetail = (cafe: any) => {
    setSelectedCafe(cafe);
    setIsModalOpen(true);
  };

  return (
    <div className="h-screen w-full max-w-md mx-auto relative bg-white flex flex-col shadow-2xl overflow-hidden font-sans">
      {/* フローティングヘッダー */}
      <header className="absolute top-0 left-0 right-0 z-50 p-4 space-y-3 pointer-events-none">
        <div className="flex flex-col gap-3">
          {/* 検索バー */}
          <div className="flex items-center bg-white/95 backdrop-blur shadow-xl rounded-2xl p-1 pointer-events-auto border border-gray-100">
            <div className="flex-1 relative group">
              <input
                ref={inputRef}
                type="text"
                placeholder="駅名・地名を入力..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-3 bg-transparent text-sm font-bold outline-none"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="bg-orange-600 text-white p-3 rounded-xl shadow-lg active:scale-95 transition-all disabled:bg-gray-300"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              )}
            </button>
          </div>

          {/* 飲食店カテゴリ選択 */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pointer-events-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-[10px] font-black border shadow-sm transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat.value
                    ? 'bg-gray-900 border-gray-900 text-white'
                    : 'bg-white/95 backdrop-blur border-gray-200 text-gray-600'
                }`}
              >
                <span>{cat.icon}</span>{cat.label}
              </button>
            ))}
          </div>

          {/* クイックタグ */}
          {!loading && (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pointer-events-auto">
              {QUICK_SEARCH_TAGS.map((tag) => (
                <button
                  key={tag.name}
                  onClick={() => handleSearch(tag.name)}
                  className="flex-shrink-0 px-3 py-1.5 bg-white/90 backdrop-blur border border-gray-200 rounded-full text-[10px] font-black text-gray-700 shadow-sm hover:bg-orange-50 transition-all flex items-center gap-1"
                >
                  <span>{tag.icon}</span>{tag.name}
                </button>
              ))}
            </div>
          )}

          {/* 喫煙タイプフィルター */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pointer-events-auto">
            {SMOKING_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => toggleFilter(f.value)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-[10px] font-black border shadow-sm transition-all flex items-center gap-1.5 ${
                  activeSmokingFilters.includes(f.value)
                    ? 'bg-orange-600 border-orange-600 text-white'
                    : 'bg-white/90 backdrop-blur border-gray-200 text-gray-600'
                }`}
              >
                <span>{f.emoji}</span>{f.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 relative bg-gray-100">
        <div className={`absolute inset-0 z-0 transition-opacity duration-500 ${viewMode === 'map' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div ref={mapContainerRef} className="h-full w-full"></div>
          
          <button
            onClick={getCurrentLocation}
            className="absolute bottom-28 right-4 z-10 p-4 bg-white text-orange-600 rounded-full shadow-2xl active:scale-90 transition-all border border-gray-100"
            title="現在地へ移動"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        <div className={`absolute inset-0 z-10 bg-gray-50 overflow-y-auto p-4 pt-56 pb-32 transition-transform duration-500 ${viewMode !== 'map' ? 'translate-y-0' : 'translate-y-full'}`}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-orange-100 border-t-orange-600 rounded-full animate-spin"></div>
              <p className="text-gray-900 font-black text-sm">AI調査員が口コミを精査中...</p>
            </div>
          ) : filteredCafes.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-black text-gray-900">
                  {viewMode === 'favorites' ? '保存済みのお店' : '検索結果'} ({filteredCafes.length})
                </h2>
              </div>
              {filteredCafes.map((cafe) => (
                <CafeCard 
                  key={cafe.id}
                  name={cafe.name}
                  description={cafe.description}
                  station={cafe.station}
                  address={cafe.address}
                  smokingType={cafe.smokingType}
                  isFavorite={isFavorite(cafe)}
                  onToggleFavorite={() => toggleFavorite(cafe)}
                  onClick={() => openDetail(cafe)}
                />
              ))}
            </div>
          ) : !error && (
            <div className="text-center py-24 px-10 space-y-4">
              <div className="text-6xl">{viewMode === 'favorites' ? '🤍' : '🚬'}</div>
              <h3 className="text-xl font-black text-gray-900">
                {viewMode === 'favorites' ? 'お気に入りはまだありません' : '喫煙できるお店を探す'}
              </h3>
              <p className="text-gray-500 text-xs">
                {viewMode === 'favorites' ? '気になるお店の「詳細」からお気に入りに保存できます。' : 'カテゴリを選んで周囲を検索してください。AIが最新情報を分析します。'}
              </p>
            </div>
          )}
          {error && (
            <div className="p-10 text-center space-y-4">
              <div className="text-orange-500 text-5xl">🔭</div>
              <p className="text-gray-900 font-black">{error}</p>
              <button onClick={() => setError(null)} className="text-xs font-black text-orange-600 px-6 py-3 bg-orange-50 rounded-full">戻る</button>
            </div>
          )}
        </div>
      </main>

      {/* ボトムナビゲーション */}
      <nav className="absolute bottom-0 left-0 right-0 z-[60] bg-white/90 backdrop-blur-lg border-t border-gray-100 p-4 pb-8 flex items-center justify-between gap-4">
        <div className="flex bg-gray-100 p-1 rounded-2xl w-full">
          <button 
            onClick={() => setViewMode('map')} 
            className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all flex flex-col items-center justify-center gap-0.5 ${viewMode === 'map' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-400'}`}
          >
            <span>🗺️</span> マップ
          </button>
          <button 
            onClick={() => setViewMode('list')} 
            className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all flex flex-col items-center justify-center gap-0.5 ${viewMode === 'list' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-400'}`}
          >
            <span>📋</span> リスト
          </button>
          <button 
            onClick={() => setViewMode('favorites')} 
            className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all flex flex-col items-center justify-center gap-0.5 ${viewMode === 'favorites' ? 'bg-white shadow-sm text-red-500' : 'text-gray-400'}`}
          >
            <span>❤️</span> お気に入り
          </button>
        </div>
        
        {viewMode !== 'favorites' && (
          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="flex-shrink-0 bg-gray-900 text-white font-black px-4 py-3 rounded-2xl shadow-xl active:scale-95 transition-all text-[10px] disabled:bg-gray-400"
          >
            {loading ? "AI..." : "再検索"}
          </button>
        )}
      </nav>

      <CafeDetailModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        cafe={selectedCafe}
        isFavorite={selectedCafe ? isFavorite(selectedCafe) : false}
        onToggleFavorite={() => selectedCafe && toggleFavorite(selectedCafe)}
      />
    </div>
  );
};

export default App;
