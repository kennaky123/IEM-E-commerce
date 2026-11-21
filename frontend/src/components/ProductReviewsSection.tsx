import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { api } from '../services/api';
import { Product, Review, ReviewSortOption, ReviewSummary } from '../types';
import { gsap, ScrollTrigger, useGSAP } from '../utils/gsapSetup';

interface ProductReviewsSectionProps {
  product: Product;
  onSummaryChange?: (summary: ReviewSummary) => void;
}

const STAR_LEVELS: ReadonlyArray<1 | 2 | 3 | 4 | 5> = [5, 4, 3, 2, 1];
const RATING_LABELS: Record<number, string> = {
  1: 'Rất tệ',
  2: 'Chưa hài lòng',
  3: 'Bình thường',
  4: 'Hài lòng',
  5: 'Tuyệt vời',
};

const EMPTY_SUMMARY: ReviewSummary = {
  averageRating: 0,
  totalReviews: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

function renderStarRow(score: number): React.ReactNode {
  const filled = Math.max(0, Math.min(5, Math.round(score)));
  return (
    <span className="inline-flex items-center tracking-tight" aria-label={`${score} trên 5 sao`}>
      <span className="text-[#5433eb]">{'★'.repeat(filled)}</span>
      <span className="text-[#d4d4d8]">{'☆'.repeat(5 - filled)}</span>
    </span>
  );
}

export const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({
  product,
  onSummaryChange,
}) => {
  const { user, token, setAuthModalOpen, refreshProducts, notify } = useStore();
  const sectionRef = useRef<HTMLElement>(null);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<ReviewSortOption>('newest');
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined);
  const [listAnimKey, setListAnimKey] = useState(0);

  // Composer state
  const [newRating, setNewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Reply state
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Busy deletion guards
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);

  // Reset transient UI filters when switching products
  useEffect(() => {
    setSort('newest');
    setRatingFilter(undefined);
    setEditingId(null);
    setReplyingToId(null);
    setReplyDraft('');
    setFormError(null);
  }, [product.id]);

  // Fetch reviews + live rating aggregation from MongoDB
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api
      .getProductReviews(product.id, { sort, rating: ratingFilter })
      .then((res) => {
        if (cancelled) return;
        setReviews(res.reviews);
        setSummary(res.summary);
        onSummaryChange?.(res.summary);
        setListAnimKey((k) => k + 1);
        window.setTimeout(() => ScrollTrigger.refresh(), 120);
      })
      .catch(() => {
        if (cancelled) return;
        setReviews([]);
        setSummary(EMPTY_SUMMARY);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [product.id, sort, ratingFilter, onSummaryChange]);

  // Section header + overview scroll reveal
  useGSAP(
    () => {
      if (!sectionRef.current) return;
      gsap.fromTo(
        ['.js-reviews-header', '.js-reviews-overview'],
        { y: 32, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          stagger: 0.1,
          duration: 0.75,
          ease: 'power3.out',
          clearProps: 'transform',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 90%',
            once: true,
          },
        }
      );
    },
    { scope: sectionRef, dependencies: [product.id], revertOnUpdate: true }
  );

  // Smooth card reveal when list loads / sorts / filters
  useGSAP(
    () => {
      if (loading || reviews.length === 0) return;
      gsap.fromTo(
        '.js-review-card',
        { y: 18, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          stagger: 0.06,
          duration: 0.45,
          ease: 'power2.out',
          clearProps: 'transform',
        }
      );
    },
    { scope: sectionRef, dependencies: [loading, listAnimKey] }
  );

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) {
      setAuthModalOpen(true);
      return;
    }

    const trimmed = newComment.trim();
    if (trimmed.length < 2) {
      setFormError('Vui lòng nhập bình luận tối thiểu 2 ký tự.');
      return;
    }

    setFormError(null);
    setSubmitting(true);
    try {
      const res = await api.createReview(
        product.id,
        { rating: newRating, comment: trimmed },
        token
      );
      setSummary(res.summary);
      onSummaryChange?.(res.summary);

      // Re-align list cleanly with active filter/sort
      const shouldShow =
        ratingFilter === undefined || ratingFilter === res.review.rating;
      if (shouldShow && sort === 'newest') {
        setReviews((prev) => [res.review, ...prev]);
        setListAnimKey((k) => k + 1);
      } else {
        setRatingFilter(undefined);
        setSort('newest');
      }

      setNewComment('');
      setNewRating(5);
      await refreshProducts();
      window.setTimeout(() => ScrollTrigger.refresh(), 120);
      notify('Đã gửi đánh giá & bình luận của bạn!', 'success');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Không thể gửi đánh giá lúc này.';
      setFormError(msg);
      notify(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (rev: Review) => {
    setEditingId(rev.id);
    setEditRating(rev.rating);
    setEditComment(rev.comment);
  };

  const handleSaveEdit = async (reviewId: string) => {
    if (!token) {
      setAuthModalOpen(true);
      return;
    }

    const trimmed = editComment.trim();
    if (trimmed.length < 2) {
      notify('Nội dung bình luận phải có ít nhất 2 ký tự.', 'error');
      return;
    }

    setSavingEdit(true);
    try {
      const res = await api.updateReview(
        reviewId,
        { rating: editRating, comment: trimmed },
        token
      );
      setSummary(res.summary);
      onSummaryChange?.(res.summary);
      setReviews((prev) => {
        const next = prev.map((r) => (r.id === reviewId ? res.review : r));
        return ratingFilter !== undefined
          ? next.filter((r) => r.rating === ratingFilter)
          : next;
      });
      setEditingId(null);
      await refreshProducts();
      notify('Đã cập nhật đánh giá.', 'success');
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'Không thể cập nhật đánh giá.',
        'error'
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!token) {
      setAuthModalOpen(true);
      return;
    }
    setDeletingReviewId(reviewId);
    try {
      const res = await api.deleteReview(reviewId, token);
      setSummary(res.summary);
      onSummaryChange?.(res.summary);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      await refreshProducts();
      window.setTimeout(() => ScrollTrigger.refresh(), 120);
      notify('Đã xóa đánh giá.', 'info');
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'Không thể xóa đánh giá.',
        'error'
      );
    } finally {
      setDeletingReviewId(null);
    }
  };

  const handleOpenReply = (reviewId: string) => {
    if (!user || !token) {
      notify('Vui lòng đăng nhập để trả lời bình luận.', 'info');
      setAuthModalOpen(true);
      return;
    }
    if (replyingToId === reviewId) {
      setReplyingToId(null);
      setReplyDraft('');
    } else {
      setReplyingToId(reviewId);
      setReplyDraft('');
    }
  };

  const handleSubmitReply = async (e: React.FormEvent, reviewId: string) => {
    e.preventDefault();
    if (!token) {
      setAuthModalOpen(true);
      return;
    }

    const trimmed = replyDraft.trim();
    if (trimmed.length < 2) {
      notify('Phản hồi cần tối thiểu 2 ký tự.', 'error');
      return;
    }

    setSubmittingReply(true);
    try {
      const res = await api.addReviewReply(reviewId, trimmed, token);
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? res.review : r)));
      setReplyingToId(null);
      setReplyDraft('');
      window.setTimeout(() => ScrollTrigger.refresh(), 100);
      notify('Đã gửi phản hồi.', 'success');
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'Không thể gửi phản hồi.',
        'error'
      );
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeleteReply = async (reviewId: string, replyId: string) => {
    if (!token) {
      setAuthModalOpen(true);
      return;
    }
    setDeletingReplyId(replyId);
    try {
      const res = await api.deleteReviewReply(reviewId, replyId, token);
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? res.review : r)));
      notify('Đã xóa phản hồi.', 'info');
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'Không thể xóa phản hồi.',
        'error'
      );
    } finally {
      setDeletingReplyId(null);
    }
  };

  const displayStarValue = hoverRating ?? newRating;

  return (
    <section
      id="product-reviews"
      ref={sectionRef}
      className="shop-card rounded-[22px] sm:rounded-[28px] bg-[#ffffff] p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6"
    >
      {/* Header Row */}
      <div className="js-reviews-header flex flex-wrap items-center justify-between gap-3 border-b border-[#ebebeb] pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#f2f4f5] px-3 py-1 text-[12px] tracking-[-0.017em] text-[#787574]">
            <span className="h-2 w-2 rounded-full bg-[#5433eb]" />
            <span>Đánh giá &amp; Bình luận cộng đồng</span>
          </div>
          <h2 className="text-[24px] leading-tight tracking-[-0.05em] text-[#000000]">
            Nhận xét về {product.name}
          </h2>
        </div>

        <span className="rounded-full bg-[#f2f4f5] px-3.5 py-1.5 text-[13px] tracking-[-0.014em] text-[#5433eb]">
          {summary.totalReviews} đánh giá
        </span>
      </div>

      {/* Overview Metric + 5→1 Histogram + Sort Bar */}
      <div className="js-reviews-overview grid grid-cols-1 gap-5 lg:grid-cols-12 items-stretch">
        {/* Big Average Score Box */}
        <div className="lg:col-span-4 rounded-[20px] bg-[#f2f4f5] p-5 flex flex-col items-center justify-center text-center space-y-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[44px] leading-none tracking-[-0.05em] text-[#000000]">
              {summary.totalReviews > 0 ? summary.averageRating.toFixed(1) : '0.0'}
            </span>
            <span className="text-[16px] text-[#787574]">/ 5.0</span>
          </div>
          <div className="text-[18px]">
            {renderStarRow(
              summary.totalReviews > 0 ? summary.averageRating : 0
            )}
          </div>
          <p className="text-[13px] tracking-[-0.014em] text-[#787574]">
            {summary.totalReviews > 0
              ? `Tổng hợp từ ${summary.totalReviews} nhận xét đã xác thực`
              : 'Chưa có đánh giá từ người dùng'}
          </p>
        </div>

        {/* Interactive 5→1 Star Distribution Histogram */}
        <div className="lg:col-span-5 rounded-[20px] bg-[#f2f4f5] p-5 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] tracking-[-0.017em] text-[#787574]">
              Phân bố số sao (chọn để lọc)
            </span>
            {ratingFilter !== undefined && (
              <button
                type="button"
                onClick={() => setRatingFilter(undefined)}
                className="rounded-full bg-[#ffffff] px-2.5 py-0.5 text-[11px] text-[#5433eb] shadow-[0_2px_6px_rgba(0,0,0,0.05)] hover:bg-[#5433eb] hover:text-[#ffffff] cursor-pointer transition-colors"
              >
                Tất cả sao
              </button>
            )}
          </div>

          {STAR_LEVELS.map((star) => {
            const count = summary.distribution[star] ?? 0;
            const percent =
              summary.totalReviews > 0
                ? Math.round((count / summary.totalReviews) * 100)
                : 0;
            const active = ratingFilter === star;

            return (
              <button
                key={star}
                type="button"
                onClick={() =>
                  setRatingFilter((prev) => (prev === star ? undefined : star))
                }
                className={`w-full flex items-center gap-3 rounded-full px-2.5 py-1 text-[12px] cursor-pointer transition-colors ${
                  active
                    ? 'bg-[#ffffff] ring-1 ring-[#5433eb] text-[#000000]'
                    : 'hover:bg-[#ffffff]/70 text-[#787574]'
                }`}
              >
                <span className="w-10 text-left font-medium text-[#000000]">
                  {star} ★
                </span>
                <div className="flex-1 h-2 overflow-hidden rounded-full bg-[#ebebeb]">
                  <div
                    className="h-full rounded-full bg-[#5433eb] transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="w-8 text-right tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Sort Controls */}
        <div className="lg:col-span-3 rounded-[20px] bg-[#f2f4f5] p-5 flex flex-col justify-between space-y-3">
          <span className="text-[12px] tracking-[-0.017em] text-[#787574]">
            Sắp xếp bình luận
          </span>
          <div className="flex flex-wrap lg:flex-col gap-2">
            {(
              [
                { value: 'newest', label: 'Mới nhất' },
                { value: 'highest', label: 'Sao cao nhất' },
                { value: 'lowest', label: 'Sao thấp nhất' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSort(opt.value)}
                className={`rounded-full px-4 py-2 text-[13px] tracking-[-0.014em] text-left cursor-pointer transition-colors ${
                  sort === opt.value
                    ? 'bg-[#000000] text-[#ffffff]'
                    : 'bg-[#ffffff] text-[#000000] hover:bg-[#ebebeb]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Write Comment & Star Rating Composer */}
      {!user || !token ? (
        <div className="rounded-[20px] bg-[#f2f4f5] p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[15px] tracking-[-0.02em] text-[#000000]">
              Bạn đã trải nghiệm {product.name}?
            </p>
            <p className="text-[13px] tracking-[-0.014em] text-[#787574]">
              Đăng nhập để đánh giá sao và viết bình luận cho sản phẩm này.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="rounded-full bg-[#5433eb] px-6 py-3 text-[13px] tracking-[-0.014em] text-[#ffffff] shadow-[0_4px_20px_rgba(69,36,219,0.3)] hover:bg-[#4524db] cursor-pointer transition-colors"
          >
            Đăng nhập ngay
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmitReview}
          className="rounded-[20px] bg-[#f2f4f5] p-5 md:p-6 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5433eb] text-[13px] font-medium text-[#ffffff]">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="text-[14px] text-[#000000]">{user.name}</p>
                <p className="text-[12px] text-[#787574]">
                  Chọn số sao và chia sẻ cảm nhận chất âm của bạn
                </p>
              </div>
            </div>

            {/* Interactive 1–5 Star Picker */}
            <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-2 rounded-full bg-[#ffffff] px-3.5 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={() => setNewRating(star)}
                    aria-label={`Chấm ${star} sao`}
                    className={`text-[20px] leading-none px-0.5 cursor-pointer transition-transform hover:scale-110 ${
                      star <= displayStarValue
                        ? 'text-[#5433eb]'
                        : 'text-[#d4d4d8]'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <span className="text-[12px] text-[#000000] min-w-[82px] text-right">
                {RATING_LABELS[displayStarValue]}
              </span>
            </div>
          </div>

          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Ví dụ: Bass gọn có lực, dải mid mượt nghe vocal rất tự nhiên..."
            className="w-full rounded-[16px] border border-[#ebebeb] bg-[#ffffff] px-4 py-3 text-[14px] leading-[1.5] text-[#000000] placeholder:text-[#787574]/70 focus:border-[#5433eb] focus:outline-none"
          />

          {formError && (
            <p className="text-[13px] text-red-600">{formError}</p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[12px] text-[#787574] tabular-nums">
              {newComment.trim().length} / 2000 ký tự
            </span>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-[#5433eb] px-6 py-2.5 text-[13px] tracking-[-0.014em] text-[#ffffff] shadow-[0_4px_20px_rgba(69,36,219,0.28)] hover:bg-[#4524db] cursor-pointer transition-colors disabled:opacity-50"
            >
              {submitting ? 'Đang gửi...' : 'Gửi đánh giá & bình luận'}
            </button>
          </div>
        </form>
      )}

      {/* Reviews & Replies Thread List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="h-28 rounded-[20px] bg-[#f2f4f5] animate-pulse"
            />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-[20px] bg-[#f2f4f5] p-8 text-center space-y-2">
          <p className="text-[15px] text-[#000000]">
            {ratingFilter !== undefined
              ? `Không có đánh giá nào ở mức ${ratingFilter} sao.`
              : 'Chưa có đánh giá nào — hãy là người đầu tiên chia sẻ cảm nhận!'}
          </p>
          {ratingFilter !== undefined && (
            <button
              type="button"
              onClick={() => setRatingFilter(undefined)}
              className="rounded-full bg-[#ffffff] px-4 py-1.5 text-[12px] text-[#5433eb] hover:bg-[#5433eb] hover:text-[#ffffff] cursor-pointer transition-colors"
            >
              Xem tất cả đánh giá
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => {
            const isOwner = user?.id === rev.userId;
            const canDelete = isOwner || user?.role === 'admin';
            const isEditing = editingId === rev.id;
            const isEdited = rev.updatedAt !== rev.createdAt;

            return (
              <article
                key={rev.id}
                className="js-review-card rounded-[20px] bg-[#f2f4f5] p-5 space-y-3"
              >
                {/* Review Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-medium text-[#ffffff] ${
                        rev.userRole === 'admin' ? 'bg-[#5433eb]' : 'bg-[#000000]'
                      }`}
                    >
                      {rev.userName.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] text-[#000000]">
                          {rev.userName}
                        </span>
                        {rev.userRole === 'admin' && (
                          <span className="rounded-full bg-[#5433eb] px-2.5 py-0.5 text-[10px] text-[#ffffff]">
                            MOONDROP Official
                          </span>
                        )}
                        {rev.verifiedPurchase && (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] text-emerald-700">
                            ✓ Đã mua hàng
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#787574]">
                        <span className="text-[13px]">
                          {renderStarRow(rev.rating)}
                        </span>
                        <span>·</span>
                        <span>
                          {new Date(rev.createdAt).toLocaleString('vi-VN')}
                        </span>
                        {isEdited && <span>(đã chỉnh sửa)</span>}
                      </div>
                    </div>
                  </div>

                  {/* Review Action Pills */}
                  {!isEditing && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenReply(rev.id)}
                        className="rounded-full bg-[#ffffff] px-3 py-1 text-[12px] text-[#000000] hover:text-[#5433eb] cursor-pointer transition-colors"
                      >
                        {replyingToId === rev.id ? 'Đóng' : 'Trả lời'}
                      </button>
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => startEditing(rev)}
                          className="rounded-full bg-[#ffffff] px-3 py-1 text-[12px] text-[#000000] hover:text-[#5433eb] cursor-pointer transition-colors"
                        >
                          Sửa
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          disabled={deletingReviewId === rev.id}
                          onClick={() => handleDeleteReview(rev.id)}
                          className="rounded-full bg-[#ffffff] px-3 py-1 text-[12px] text-red-600 hover:bg-red-50 cursor-pointer transition-colors disabled:opacity-50"
                        >
                          {deletingReviewId === rev.id ? 'Đang xóa...' : 'Xóa'}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Review Body or Inline Edit Mode */}
                {isEditing ? (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setEditRating(star)}
                          className={`text-[18px] cursor-pointer ${
                            star <= editRating
                              ? 'text-[#5433eb]'
                              : 'text-[#d4d4d8]'
                          }`}
                        >
                          ★
                        </button>
                      ))}
                      <span className="ml-2 text-[12px] text-[#787574]">
                        {RATING_LABELS[editRating]}
                      </span>
                    </div>
                    <textarea
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                      rows={3}
                      maxLength={2000}
                      className="w-full rounded-[16px] border border-[#ebebeb] bg-[#ffffff] px-3.5 py-2.5 text-[14px] text-[#000000] focus:border-[#5433eb] focus:outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={savingEdit}
                        onClick={() => handleSaveEdit(rev.id)}
                        className="rounded-full bg-[#5433eb] px-4 py-1.5 text-[12px] text-[#ffffff] hover:bg-[#4524db] cursor-pointer transition-colors disabled:opacity-50"
                      >
                        {savingEdit ? 'Đang lưu...' : 'Lưu'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-full bg-[#ffffff] px-4 py-1.5 text-[12px] text-[#787574] hover:text-[#000000] cursor-pointer transition-colors"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-line text-[14px] leading-[1.6] tracking-[-0.014em] text-[#000000]">
                    {rev.comment}
                  </p>
                )}

                {/* Threaded Replies */}
                {(rev.replies.length > 0 || replyingToId === rev.id) && (
                  <div className="ml-2 sm:ml-8 mt-3 space-y-2.5 border-l-2 border-[#ebebeb] pl-3 sm:pl-4">
                    {rev.replies.map((reply) => {
                      const canDeleteReply =
                        user?.id === reply.userId || user?.role === 'admin';
                      return (
                        <div
                          key={reply.id}
                          className="rounded-[16px] bg-[#ffffff] p-3.5 space-y-1.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[13px] font-medium text-[#000000]">
                                {reply.userName}
                              </span>
                              {reply.userRole === 'admin' && (
                                <span className="rounded-full bg-[#5433eb] px-2 py-0.5 text-[10px] text-[#ffffff]">
                                  MOONDROP Official
                                </span>
                              )}
                              <span className="text-[11px] text-[#787574]">
                                {new Date(reply.createdAt).toLocaleString('vi-VN')}
                              </span>
                            </div>
                            {canDeleteReply && (
                              <button
                                type="button"
                                disabled={deletingReplyId === reply.id}
                                onClick={() =>
                                  handleDeleteReply(rev.id, reply.id)
                                }
                                className="text-[11px] text-red-600 hover:underline cursor-pointer disabled:opacity-50"
                              >
                                {deletingReplyId === reply.id ? '...' : 'Xóa'}
                              </button>
                            )}
                          </div>
                          <p className="whitespace-pre-line text-[13px] leading-[1.5] text-[#000000]">
                            {reply.content}
                          </p>
                        </div>
                      );
                    })}

                    {replyingToId === rev.id && (
                      <form
                        onSubmit={(e) => handleSubmitReply(e, rev.id)}
                        className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-1"
                      >
                        <input
                          type="text"
                          value={replyDraft}
                          onChange={(e) => setReplyDraft(e.target.value)}
                          maxLength={1000}
                          placeholder={`Trả lời ${rev.userName}...`}
                          className="flex-1 min-w-[200px] rounded-full border border-[#ebebeb] bg-[#ffffff] px-4 py-2 text-[13px] text-[#000000] placeholder:text-[#787574]/70 focus:border-[#5433eb] focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={submittingReply}
                          className="rounded-full bg-[#5433eb] px-4 py-2 text-[12px] text-[#ffffff] hover:bg-[#4524db] cursor-pointer transition-colors disabled:opacity-50"
                        >
                          {submittingReply ? 'Đang gửi...' : 'Gửi'}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
