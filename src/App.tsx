/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { MapPin, Navigation, AlertCircle, Loader2 } from 'lucide-react';
import MapView from './components/MapView';

export default function App() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestLocation = () => {
    setLoading(true);
    setError(null);
    
    if (!navigator.geolocation) {
      setError('متصفحك لا يدعم تحديد الموقع.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError('تعذر الحصول على موقعك. يرجى التأكد من تفعيل خدمة تحديد الموقع (GPS) ومنح الصلاحية للتطبيق.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    // Try to get location on load
    requestLocation();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans" dir="rtl">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 shadow-md z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-6 h-6" />
          <h1 className="text-xl font-bold">أقرب مرحاض</h1>
        </div>
        <button 
          onClick={requestLocation}
          className="p-2 bg-blue-700 rounded-full hover:bg-blue-800 transition-colors"
          title="تحديث الموقع"
        >
          <Navigation className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative">
        {loading && !location && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/80 z-20">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
            <p className="text-lg font-medium text-gray-700">جاري تحديد موقعك...</p>
          </div>
        )}

        {error && !location && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <p className="text-lg text-gray-800 mb-6">{error}</p>
            <button 
              onClick={requestLocation}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              المحاولة مرة أخرى
            </button>
          </div>
        )}

        {location && (
          <MapView userLocation={location} />
        )}
      </main>
    </div>
  );
}
