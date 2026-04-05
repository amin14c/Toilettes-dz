import React, { useState, useEffect } from 'react';
import { X, Star, MessageSquare, Loader2, User as UserIcon } from 'lucide-react';
import { collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from 'firebase/auth';
import { motion } from 'motion/react';

interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface ToiletDetailsModalProps {
  toilet: any;
  user: User | null;
  onClose: () => void;
}

export default function ToiletDetailsModal({ toilet, user, onClose }: ToiletDetailsModalProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  
  // New review state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!toilet?.id) return;

    const q = query(
      collection(db, 'reviews'),
      where('toiletId', '==', toilet.id.toString())
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedReviews: Review[] = [];
      snapshot.forEach((doc) => {
        fetchedReviews.push({ id: doc.id, ...doc.data() } as Review);
      });
      // Sort by date descending client-side since we didn't index it
      fetchedReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReviews(fetchedReviews);
      setLoadingReviews(false);
    }, (err) => {
      console.error("Error fetching reviews:", err);
      setLoadingReviews(false);
    });

    return () => unsubscribe();
  }, [toilet?.id]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (rating === 0) {
      setError('يرجى تحديد التقييم بالنجوم');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await addDoc(collection(db, 'reviews'), {
        toiletId: toilet.id.toString(),
        userId: user.uid,
        userName: user.displayName || 'مستخدم',
        rating,
        comment: comment.trim(),
        createdAt: new Date().toISOString()
      });
      setRating(0);
      setComment('');
    } catch (err) {
      console.error('Error adding review:', err);
      setError('حدث خطأ أثناء إضافة التقييم.');
    } finally {
      setSubmitting(false);
    }
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length).toFixed(1)
    : '0';

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
        className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 shrink-0">
          <h2 className="text-lg font-bold text-gray-800">
            {toilet.tags?.name || toilet.name || 'مرحاض عمومي'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 flex-1">
          {/* Rating Summary */}
          <div className="flex items-center gap-4 mb-6 bg-blue-50 p-4 rounded-xl">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-700">{averageRating}</div>
              <div className="text-sm text-gray-600 mt-1">{reviews.length} تقييمات</div>
            </div>
            <div className="flex-1 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star} 
                  className={`w-6 h-6 ${star <= Math.round(Number(averageRating)) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                />
              ))}
            </div>
          </div>

          {/* Add Review Section */}
          <div className="mb-8">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              أضف تقييمك
            </h3>
            
            {!user ? (
              <div className="bg-gray-50 p-4 rounded-lg text-center border border-gray-200 text-gray-600 text-sm">
                يرجى تسجيل الدخول لتتمكن من إضافة تقييم.
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-3">
                {error && <div className="text-red-600 text-sm">{error}</div>}
                
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 focus:outline-none"
                    >
                      <Star 
                        className={`w-7 h-7 transition-colors ${
                          star <= (hoverRating || rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                        }`} 
                      />
                    </button>
                  ))}
                </div>

                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="شارك تجربتك ورأيك حول نظافة وتوفر هذا المرحاض..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none h-24 text-sm"
                ></textarea>

                <button
                  type="submit"
                  disabled={submitting || rating === 0}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'نشر التقييم'}
                </button>
              </form>
            )}
          </div>

          {/* Reviews List */}
          <div>
            <h3 className="font-bold text-gray-800 mb-4">التقييمات السابقة</h3>
            {loadingReviews ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                لا توجد تقييمات بعد. كن أول من يقيّم!
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div key={rev.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-blue-100 p-1.5 rounded-full text-blue-600">
                          <UserIcon className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-sm text-gray-800">{rev.userName}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            className={`w-3.5 h-3.5 ${star <= rev.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                          />
                        ))}
                      </div>
                    </div>
                    {rev.comment && (
                      <p className="text-gray-700 text-sm mt-2 leading-relaxed">
                        {rev.comment}
                      </p>
                    )}
                    <div className="text-xs text-gray-400 mt-3">
                      {new Date(rev.createdAt).toLocaleDateString('ar-DZ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
