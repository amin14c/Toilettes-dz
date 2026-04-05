import React, { useState } from 'react';
import { X, Mail, Lock, Loader2 } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithRedirect } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { motion } from 'motion/react';

interface AuthModalProps {
  onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'البريد الإلكتروني غير صالح.';
      case 'auth/user-disabled':
        return 'تم تعطيل هذا الحساب.';
      case 'auth/user-not-found':
        return 'لم يتم العثور على حساب بهذا البريد الإلكتروني.';
      case 'auth/wrong-password':
        return 'كلمة المرور غير صحيحة.';
      case 'auth/email-already-in-use':
        return 'البريد الإلكتروني مستخدم بالفعل.';
      case 'auth/weak-password':
        return 'كلمة المرور ضعيفة جداً (يجب أن تكون 6 أحرف على الأقل).';
      case 'auth/invalid-credential':
        return 'بيانات الدخول غير صحيحة.';
      default:
        return 'حدث خطأ أثناء العملية. يرجى المحاولة مرة أخرى.';
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      console.error("Google auth error:", err);
      setError("حدث خطأ أثناء تسجيل الدخول بواسطة جوجل.");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-[3000] flex items-center justify-center p-4 backdrop-blur-sm" 
      dir="rtl"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">
            {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Tabs */}
          <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
            <button
              onClick={() => { setIsLogin(true); setError(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              تسجيل الدخول
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${!isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              حساب جديد
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pr-10 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="name@example.com"
                  required
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-10 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  dir="ltr"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-bold flex items-center justify-center gap-2 disabled:opacity-70 mt-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'دخول' : 'إنشاء حساب')}
            </button>
          </form>

          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">أو</span>
            </div>
          </div>

          <button
            onClick={handleGoogleAuth}
            type="button"
            className="mt-6 w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium text-gray-700"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            المتابعة باستخدام حساب Google
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
