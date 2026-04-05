/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { MapPin, Navigation, AlertCircle, Loader2, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import MapView from './components/MapView';
import AuthModal from './components/AuthModal';
import { auth, googleProvider } from './firebase';
import { signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { AnimatePresence } from 'motion/react';

export default function App() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    // Handle redirect result for mobile
    getRedirectResult(auth).then((result) => {
      if (result) {
        setUser(result.user);
      }
    }).catch((error) => {
      console.error("Error during redirect sign in:", error);
      alert("حدث خطأ أثناء تسجيل الدخول: " + error.message);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

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
        setError('تعذر الحصول على موقعك. يرجى التأكد من تفعيل خدمة تحديد الموقع (GPS).');
        // Fallback to Algiers, Algeria if location is denied or fails
        setLocation({
          lat: 36.7538,
          lng: 3.0588
        });
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
    <div className="flex flex-col h-[100dvh] bg-gray-50 text-gray-900 font-sans" dir="rtl">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 shadow-md z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-6 h-6" />
          <h1 className="text-xl font-bold">أقرب مرحاض</h1>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-blue-700 px-3 py-1.5 rounded-full">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon className="w-5 h-5" />
                )}
                <span className="text-sm font-medium hidden sm:inline-block">{user.displayName || 'مستخدم'}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 bg-blue-700 rounded-full hover:bg-red-600 transition-colors"
                title="تسجيل الخروج"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-full hover:bg-gray-100 transition-colors font-medium text-sm shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              <span>تسجيل الدخول</span>
            </button>
          )}
          <button 
            onClick={requestLocation}
            className="p-2 bg-blue-700 rounded-full hover:bg-blue-800 transition-colors"
            title="تحديث الموقع"
          >
            <Navigation className="w-5 h-5" />
          </button>
        </div>
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
          <MapView userLocation={location} user={user} />
        )}
      </main>

      <AnimatePresence>
        {showAuthModal && (
          <AuthModal onClose={() => setShowAuthModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
