import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Bath, Coins, Accessibility, CheckCircle, XCircle, Plus, Star, Search } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from 'firebase/auth';
import { AnimatePresence } from 'motion/react';
import AddToiletModal from './AddToiletModal';
import ToiletDetailsModal from './ToiletDetailsModal';

// Fix Leaflet default icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom icon for user location
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom icon for toilets
const toiletIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'marker-fade-in'
});

// Custom icon for user-added toilets
const customToiletIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'marker-fade-in'
});

interface Toilet {
  id: string | number;
  lat: number;
  lon?: number;
  lng?: number;
  tags?: {
    name?: string;
    fee?: string;
    wheelchair?: string;
    [key: string]: any;
  };
  name?: string;
  fee?: string;
  wheelchair?: string;
  isCustom?: boolean;
}

// Component to recenter map when user location changes
function RecenterAutomatically({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

// Component to handle map events (panning, zooming)
function MapEventsHandler({ 
  isAdding, 
  onLocationSelect, 
  onMapMove 
}: { 
  isAdding: boolean; 
  onLocationSelect: (latlng: L.LatLng) => void;
  onMapMove: (center: L.LatLng) => void;
}) {
  const map = useMapEvents({
    click(e) {
      if (isAdding) {
        onLocationSelect(e.latlng);
      }
    },
    moveend() {
      onMapMove(map.getCenter());
    }
  });
  return null;
}

interface MapViewProps {
  userLocation: { lat: number; lng: number };
  user: User | null;
}

export default function MapView({ userLocation, user }: MapViewProps) {
  const [toilets, setToilets] = useState<Toilet[]>([]);
  const [customToilets, setCustomToilets] = useState<Toilet[]>([]);
  const [loadingToilets, setLoadingToilets] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number}>(userLocation);
  const [showSearchArea, setShowSearchArea] = useState(false);
  
  // Modals state
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [selectedToilet, setSelectedToilet] = useState<Toilet | null>(null);

  // Fetch custom toilets from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'toilets'), (snapshot) => {
      const fetched: Toilet[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, isCustom: true, ...doc.data() } as Toilet);
      });
      setCustomToilets(fetched);
    }, (err) => {
      console.error("Error fetching custom toilets:", err);
    });

    return () => unsubscribe();
  }, []);

  const fetchToilets = async (center: {lat: number, lng: number}) => {
    setLoadingToilets(true);
    setError(null);
    setShowSearchArea(false);
    try {
      // Overpass API query to find toilets within 15km of the center
      const radius = 15000; // 15km
      const query = `
        [out:json][timeout:25];
        (
          node["amenity"="toilets"](around:${radius},${center.lat},${center.lng});
          way["amenity"="toilets"](around:${radius},${center.lat},${center.lng});
          relation["amenity"="toilets"](around:${radius},${center.lat},${center.lng});
        );
        out center;
      `;
      
      const endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://lz4.overpass-api.de/api/interpreter',
        'https://z.overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter'
      ];

      let data = null;
      let lastError = null;

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          data = await response.json();
          break; // Success, exit the loop
        } catch (err) {
          console.warn(`Endpoint ${endpoint} failed:`, err);
          lastError = err;
        }
      }

      if (!data) {
        throw lastError || new Error('All Overpass API endpoints failed');
      }
      
      const parsedToilets = data.elements.map((el: any) => ({
        id: el.id,
        lat: el.type === 'node' ? el.lat : el.center.lat,
        lon: el.type === 'node' ? el.lon : el.center.lon,
        tags: el.tags || {},
        isCustom: false
      }));
      
      setToilets(parsedToilets);
    } catch (err) {
      console.error("Error fetching toilets:", err);
      setError('حدث خطأ أثناء البحث عن المراحيض القريبة.');
    } finally {
      setLoadingToilets(false);
    }
  };

  useEffect(() => {
    if (userLocation) {
      fetchToilets(userLocation);
    }
  }, [userLocation]);

  const handleMapMove = useCallback((center: L.LatLng) => {
    setMapCenter({ lat: center.lat, lng: center.lng });
    // Show "Search this area" button if moved significantly
    const distance = Math.sqrt(
      Math.pow(center.lat - userLocation.lat, 2) + 
      Math.pow(center.lng - userLocation.lng, 2)
    );
    if (distance > 0.05) { // Roughly 5km
      setShowSearchArea(true);
    }
  }, [userLocation]);

  const getGoogleMapsUrl = (lat: number, lon: number) => {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=walking`;
  };

  const handleAddClick = () => {
    if (!user) {
      alert("يرجى تسجيل الدخول أولاً لتتمكن من إضافة مرحاض جديد.");
      return;
    }
    setIsAddingMode(!isAddingMode);
    setSelectedLocation(null);
  };

  const allToilets = [...toilets, ...customToilets];

  return (
    <div className="w-full h-full relative">
      {isAddingMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg text-sm font-bold whitespace-nowrap animate-pulse">
          انقر على الخريطة لتحديد موقع المرحاض الجديد
        </div>
      )}

      {loadingToilets && !isAddingMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white px-4 py-2 rounded-full shadow-lg text-sm font-medium text-blue-600 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          جاري البحث عن المراحيض...
        </div>
      )}
      
      {error && !isAddingMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-red-100 text-red-700 px-4 py-2 rounded-full shadow-lg text-sm font-medium whitespace-nowrap">
          {error}
        </div>
      )}

      {!loadingToilets && !error && allToilets.length === 0 && !isAddingMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-amber-100 text-amber-800 px-4 py-2 rounded-full shadow-lg text-sm font-medium whitespace-nowrap border border-amber-200">
          عذراً، لم يتم العثور على مراحيض عمومية مسجلة في محيط 15 كم.
        </div>
      )}

      {/* Search this area button */}
      {showSearchArea && !loadingToilets && !isAddingMode && (
        <button
          onClick={() => fetchToilets(mapCenter)}
          className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] bg-white text-blue-600 px-5 py-2.5 rounded-full shadow-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-50 transition-colors border border-blue-100"
        >
          <Search className="w-4 h-4" />
          البحث في هذه المنطقة
        </button>
      )}

      {/* Add Toilet Floating Button */}
      <button
        onClick={handleAddClick}
        className={`absolute bottom-8 right-4 sm:bottom-12 sm:right-8 z-[1000] px-6 py-4 rounded-full shadow-2xl transition-all flex items-center justify-center gap-2 font-bold text-base ${
          isAddingMode ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
        }`}
        title={isAddingMode ? 'إلغاء الإضافة' : 'إضافة مرحاض جديد'}
      >
        {isAddingMode ? (
          <>
            <XCircle className="w-6 h-6" />
            <span>إلغاء</span>
          </>
        ) : (
          <>
            <Plus className="w-6 h-6" />
            <span>إضافة مرحاض</span>
          </>
        )}
      </button>

      <MapContainer 
        center={[userLocation.lat, userLocation.lng]} 
        zoom={14} 
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <ZoomControl position="bottomleft" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <RecenterAutomatically lat={userLocation.lat} lng={userLocation.lng} />

        <MapEventsHandler 
          isAdding={isAddingMode} 
          onLocationSelect={(latlng) => {
            setSelectedLocation({ lat: latlng.lat, lng: latlng.lng });
            setIsAddingMode(false);
          }}
          onMapMove={handleMapMove}
        />

        {/* User Location Marker */}
        <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
          <Popup>
            <div className="text-center font-medium" dir="rtl">موقعك الحالي</div>
          </Popup>
        </Marker>

        {/* Toilet Markers */}
        {allToilets.map(toilet => {
          const lat = toilet.lat;
          const lng = toilet.lon || toilet.lng || 0;
          const name = toilet.tags?.name || toilet.name || 'مرحاض عمومي';
          const fee = toilet.tags?.fee || toilet.fee;
          const wheelchair = toilet.tags?.wheelchair || toilet.wheelchair;

          return (
            <Marker 
              key={toilet.id} 
              position={[lat, lng]} 
              icon={toilet.isCustom ? customToiletIcon : toiletIcon}
            >
              <Popup className="toilet-popup">
                <div className="p-2 min-w-[200px]" dir="rtl">
                  <div className="flex items-center gap-2 mb-3 border-b pb-2">
                    <div className="bg-blue-100 p-1.5 rounded-full text-blue-600">
                      <Bath className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-lg text-gray-800 m-0 leading-none">
                      {name}
                    </h3>
                  </div>
                  
                  <div className="space-y-3 mb-4 text-sm text-gray-700">
                    {/* Fee Status */}
                    <div className="flex items-start gap-2">
                      <Coins className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
                      <div>
                        <span className="font-medium block mb-0.5">الدفع:</span>
                        {fee === 'yes' ? (
                          <span className="text-red-600 flex items-center gap-1"><XCircle className="w-3.5 h-3.5"/> بمقابل مادي</span>
                        ) : fee === 'no' ? (
                          <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5"/> مجاني</span>
                        ) : fee ? (
                          <span className="text-gray-600">{fee}</span>
                        ) : (
                          <span className="text-gray-400 italic">غير معروف</span>
                        )}
                      </div>
                    </div>

                    {/* Wheelchair Status */}
                    <div className="flex items-start gap-2">
                      <Accessibility className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" />
                      <div>
                        <span className="font-medium block mb-0.5">الكراسي المتحركة:</span>
                        {wheelchair === 'yes' ? (
                          <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5"/> متاح</span>
                        ) : wheelchair === 'no' ? (
                          <span className="text-red-600 flex items-center gap-1"><XCircle className="w-3.5 h-3.5"/> غير متاح</span>
                        ) : (
                          <span className="text-gray-400 italic">غير معروف</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => setSelectedToilet(toilet)}
                      className="flex items-center justify-center gap-2 w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-lg transition-colors font-medium text-sm shadow-sm"
                    >
                      <Star className="w-4 h-4" />
                      التقييمات والتفاصيل
                    </button>
                    <a 
                      href={getGoogleMapsUrl(lat, lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors font-medium text-sm shadow-sm"
                    >
                      <Navigation className="w-4 h-4" />
                      الاتجاهات
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      {/* Legend / Info */}
      <div className="absolute bottom-6 right-4 z-[1000] bg-white/90 backdrop-blur p-3 rounded-lg shadow-lg text-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <img src={userIcon.options.iconUrl} alt="User" className="w-4 h-6 object-contain" />
          <span className="font-medium text-gray-700">موقعك الحالي</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <img src={toiletIcon.options.iconUrl} alt="Toilet" className="w-4 h-6 object-contain" />
          <span className="font-medium text-gray-700">مرحاض (OpenStreetMap)</span>
        </div>
        <div className="flex items-center gap-2">
          <img src={customToiletIcon.options.iconUrl} alt="Custom Toilet" className="w-4 h-6 object-contain" />
          <span className="font-medium text-gray-700">مرحاض (مضاف من المستخدمين)</span>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {selectedLocation && user && (
          <AddToiletModal 
            key="add-modal"
            location={selectedLocation} 
            userId={user.uid} 
            onClose={() => setSelectedLocation(null)}
            onSuccess={() => {
              setSelectedLocation(null);
              alert("تم إضافة المرحاض بنجاح!");
            }}
          />
        )}

        {selectedToilet && (
          <ToiletDetailsModal
            key="details-modal"
            toilet={selectedToilet}
            user={user}
            onClose={() => setSelectedToilet(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
