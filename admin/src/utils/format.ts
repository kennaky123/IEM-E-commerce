export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const CATEGORY_LABELS: Record<string, string> = {
  IEM: 'In-Ear Monitors (IEM)',
  DAC_AMP: 'DAC & Amplifiers',
  HEADPHONE: 'Planar Headphones',
  CABLE: 'Litz Upgrade Cables',
  ACCESSORY: 'Acoustic Accessories',
};

export const ORDER_STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  PENDING: {
    label: 'Chờ xử lý',
    bg: 'bg-[#f2f4f5]',
    text: 'text-[#000000]',
    border: 'border-[#ebebeb]',
    dot: 'bg-[#5433eb]',
  },
  CONFIRMED: {
    label: 'Đã xác nhận',
    bg: 'bg-[#ffffff]',
    text: 'text-[#5433eb]',
    border: 'border-[#c0b5f3]',
    dot: 'bg-[#5433eb]',
  },
  SHIPPED: {
    label: 'Đang giao hàng',
    bg: 'bg-[#332f2d]',
    text: 'text-[#ffffff]',
    border: 'border-[#332f2d]',
    dot: 'bg-[#c0b5f3]',
  },
  DELIVERED: {
    label: 'Hoàn tất giao hàng',
    bg: 'bg-[#5433eb]',
    text: 'text-[#ffffff]',
    border: 'border-[#5433eb]',
    dot: 'bg-[#ffffff]',
  },
  CANCELLED: {
    label: 'Đã hủy',
    bg: 'bg-[#f2f4f5]',
    text: 'text-[#787574]',
    border: 'border-[#ebebeb]',
    dot: 'bg-[#787574]',
  },
};
