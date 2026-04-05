import React, { useState } from 'react';
import { X, MapPin, Loader2 } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'motion/react';

interface AddToiletModalProps {
  location: { lat: number; lng: number };
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddToiletModal({ location, userId, onClose, onSuccess }: AddToiletModalProps) {
  const [name, setName] = useState('');
  const [fee, setFee] = useState('unknown');
  const [wheelchair, setWheelchair] = useState('unknown');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى إدخال اسم أو وصف للمرحاض');
      return;
    }
    setIsConfirming(true);
  };

  const confirmSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      await addDoc(collection(db, 'toilets'), {
        lat: location.lat,
        lng: location.lng,
        name: name.trim(),
        fee: fee === 'unknown' ? '' : fee,
        wheelchair: wheelchair === 'unknown' ? '' : wheelchair,
        addedBy: userId,
        createdAt: new Date().toISOString()
      });
      onSuccess();
    } catch (err) {
      console.error('Error adding toilet:', err);
      setError('حدث خطأ أثناء إضافة المرحاض. يرجى المحاولة مرة أخرى.');
      setIsConfirming(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4" 
      dir="rtl"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            إضافة مرحاض جديد
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {!isConfirming ? (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم المرحاض / الوصف *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: مرحاض حديقة التجارب"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الدفع</label>
              <select
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="unknown">غير معروف</option>
                <option value="no">مجاني</option>
                <option value="yes">بمقابل مادي</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">متاح للكراسي المتحركة</label>
              <select
                value={wheelchair}
                onChange={(e) => setWheelchair(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="unknown">غير معروف</option>
                <option value="yes">نعم، متاح</option>
                <option value="no">لا، غير متاح</option>
              </select>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                التالي
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 text-center space-y-6">
            <div className="bg-amber-50 text-amber-600 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
              <MapPin className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">تأكيد الإضافة</h3>
              <p className="text-gray-600 leading-relaxed">
                هل أنت متأكد من رغبتك في إضافة <span className="font-bold text-gray-900">"{name}"</span> إلى الخريطة؟ 
                <br/>
                سيتمكن جميع المستخدمين من رؤية هذا الموقع.
              </p>
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                disabled={loading}
                className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                رجوع للتعديل
              </button>
              <button
                type="button"
                onClick={confirmSubmit}
                disabled={loading}
                className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تأكيد الإضافة'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
