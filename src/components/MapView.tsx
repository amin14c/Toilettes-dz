import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Info } from 'lucide-react';

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
  shadowSize: [41, 41]
});

interface Toilet {
  id: number;
  lat: number;
  lon: number;
  tags: {
    name?: string;
    fee?: string;
    wheelchair?: string;
    [key: string]: any;
  };
}

// Component to recenter map when user location changes
function RecenterAutomatically({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

export default function MapView({ userLocation }: { userLocation: { lat: number; lng: number } }) {
  const [toilets, setToilets] = useState<Toilet[]>([]);
  const [loadingToilets, setLoadingToilets] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchToilets = async () => {
      setLoadingToilets(true);
      setError(null);
      try {
        // Overpass API query to find toilets within 5km of user location
        const radius = 5000; // 5km
        const query = `
          [out:json][timeout:25];
          (
            node["amenity"="toilets"](around:${radius},${userLocation.lat},${userLocation.lng});
            way["amenity"="toilets"](around:${radius},${userLocation.lat},${userLocation.lng});
            relation["amenity"="toilets"](around:${radius},${userLocation.lat},${userLocation.lng});
          );
          out center;
        `;
        
        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: query
        });
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        
        const parsedToilets = data.elements.map((el: any) => ({
          id: el.id,
          lat: el.type === 'node' ? el.lat : el.center.lat,
          lon: el.type === 'node' ? el.lon : el.center.lon,
          tags: el.tags || {}
        }));
        
        setToilets(parsedToilets);
      } catch (err) {
        console.error("Error fetching toilets:", err);
        setError('حدث خطأ أثناء البحث عن المراحيض القريبة.');
      } finally {
        setLoadingToilets(false);
      }
    };

    if (userLocation) {
      fetchToilets();
    }
  }, [userLocation]);

  const getGoogleMapsUrl = (lat: number, lon: number) => {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=walking`;
  };

  return (
    <div className="w-full h-full relative">
      {loadingToilets && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white px-4 py-2 rounded-full shadow-lg text-sm font-medium text-blue-600 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          جاري البحث عن المراحيض...
        </div>
      )}
      
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-red-100 text-red-700 px-4 py-2 rounded-full shadow-lg text-sm font-medium">
          {error}
        </div>
      )}

      <MapContainer 
        center={[userLocation.lat, userLocation.lng]} 
        zoom={14} 
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <RecenterAutomatically lat={userLocation.lat} lng={userLocation.lng} />

        {/* User Location Marker */}
        <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
          <Popup>
            <div className="text-center font-medium" dir="rtl">موقعك الحالي</div>
          </Popup>
        </Marker>

        {/* Toilet Markers */}
        {toilets.map(toilet => (
          <Marker 
            key={toilet.id} 
            position={[toilet.lat, toilet.lon]} 
            icon={toiletIcon}
          >
            <Popup className="toilet-popup">
              <div className="p-1 min-w-[150px]" dir="rtl">
                <h3 className="font-bold text-lg mb-2 text-gray-800 border-b pb-1">
                  {toilet.tags.name || 'مرحاض عمومي'}
                </h3>
                
                <div className="space-y-2 mb-3 text-sm text-gray-600">
                  {toilet.tags.fee && (
                    <div className="flex items-center gap-1">
                      <Info className="w-4 h-4" />
                      <span>{toilet.tags.fee === 'yes' ? 'بمقابل مادي' : toilet.tags.fee === 'no' ? 'مجاني' : `السعر: ${toilet.tags.fee}`}</span>
                    </div>
                  )}
                  {toilet.tags.wheelchair && (
                    <div className="flex items-center gap-1">
                      <Info className="w-4 h-4" />
                      <span>{toilet.tags.wheelchair === 'yes' ? 'متاح للكراسي المتحركة' : 'غير متاح للكراسي المتحركة'}</span>
                    </div>
                  )}
                </div>

                <a 
                  href={getGoogleMapsUrl(toilet.lat, toilet.lon)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors font-medium text-sm"
                >
                  <Navigation className="w-4 h-4" />
                  الاتجاهات
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Legend / Info */}
      <div className="absolute bottom-6 right-4 z-[1000] bg-white/90 backdrop-blur p-3 rounded-lg shadow-lg text-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png" alt="User" className="h-6" />
          <span>موقعك</span>
        </div>
        <div className="flex items-center gap-2">
          <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png" alt="Toilet" className="h-6" />
          <span>مرحاض</span>
        </div>
      </div>
    </div>
  );
}
