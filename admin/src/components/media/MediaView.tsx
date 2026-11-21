import React, { useRef, useState } from 'react';
import { Check, ChevronRight, Copy, Plus, Search, Upload } from 'lucide-react';
import { MediaImageItem, Product } from '../../types';
import { formatBytes } from '../../utils/format';

interface MediaViewProps {
  mediaImages: MediaImageItem[];
  products: Product[];
  onUploadMedia: (filename: string, dataUrl: string) => Promise<void>;
  onSelectImageForNewProduct: (imageUrl: string) => void;
  notify: (text: string, type?: 'success' | 'error' | 'info') => void;
  onBackDashboard?: () => void;
}

export const MediaView: React.FC<MediaViewProps> = ({
  mediaImages,
  products,
  onUploadMedia,
  onSelectImageForNewProduct,
  notify,
  onBackDashboard,
}) => {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'USED' | 'UNUSED'>('ALL');
  const [uploading, setUploading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const usageMap = new Map<string, Product[]>();
  for (const p of products) {
    if (p.image) {
      const list = usageMap.get(p.image) ?? [];
      list.push(p);
      usageMap.set(p.image, list);
    }
    for (const g of p.gallery ?? []) {
      const list = usageMap.get(g) ?? [];
      if (!list.some((x) => x.id === p.id)) {
        list.push(p);
        usageMap.set(g, list);
      }
    }
  }

  const filtered = mediaImages.filter((m) => {
    const matchesSearch = m.filename.toLowerCase().includes(search.toLowerCase());
    const isUsed = (usageMap.get(m.url)?.length ?? 0) > 0;
    if (filterMode === 'USED') return matchesSearch && isUsed;
    if (filterMode === 'UNUSED') return matchesSearch && !isUsed;
    return matchesSearch;
  });

  const handleCopyPath = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    notify(`Copied URL: ${url}`, 'success');
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notify('Vui lòng chỉ chọn tệp hình ảnh (.jpg, .png, .webp)', 'error');
      return;
    }

    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      await onUploadMedia(file.name, dataUrl);
      notify(`Đã tải lên ảnh: ${file.name}`, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Tải ảnh lên thất bại', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* TailAdmin Page Header & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[24px] leading-none tracking-[-0.04em] text-[#000000]">
          Media Library
        </h2>
        <nav className="flex items-center gap-1.5 text-[13px] text-[#787574]">
          <button
            type="button"
            onClick={onBackDashboard}
            className="hover:text-[#000000] cursor-pointer"
          >
            Dashboard
          </button>
          <ChevronRight size={14} />
          <span className="text-[#5433eb]">Media Library</span>
        </nav>
      </div>

      {/* Filter & Upload Card */}
      <div className="rounded-[28px] border border-[#ebebeb] bg-[#ffffff] p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="pointer-events-none absolute left-4 top-3 text-[#787574]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên tệp ảnh (blessing-3, chu-ii, dawn-pro)..."
              className="w-full rounded-full border border-[#ebebeb] bg-[#f2f4f5] py-2.5 pl-11 pr-4 text-[13.5px] text-[#000000] placeholder:text-[#787574] focus:bg-[#ffffff] focus:border-[#5433eb] focus:outline-none transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center rounded-full bg-[#f2f4f5] p-1">
              {(
                [
                  { id: 'ALL', label: `All (${mediaImages.length})` },
                  { id: 'USED', label: 'In Use' },
                  { id: 'UNUSED', label: 'Unused' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterMode(tab.id)}
                  className={`rounded-full px-3.5 py-1.5 text-[12px] tracking-[-0.017em] cursor-pointer transition-all ${
                    filterMode === tab.id
                      ? 'bg-[#ffffff] text-[#000000] shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                      : 'text-[#787574] hover:text-[#000000]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#5433eb] px-5 py-2.5 text-[13px] tracking-[-0.014em] text-[#ffffff] shadow-[0_4px_24px_rgba(69,36,219,0.28)] hover:bg-[#4524db] disabled:opacity-50 cursor-pointer transition-all"
            >
              <Upload size={14} />
              <span>{uploading ? 'Uploading...' : 'Upload Image'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
        {filtered.map((m) => {
          const usedBy = usageMap.get(m.url) ?? [];
          const isCopied = copiedUrl === m.url;

          return (
            <div
              key={m.filename}
              className="group flex flex-col justify-between rounded-[28px] border border-[#ebebeb] bg-[#ffffff] p-2.5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.05)]"
            >
              <div>
                <div className="relative aspect-square w-full overflow-hidden rounded-[20px] bg-[#f2f4f5]/75 p-2.5 flex items-center justify-center">
                  <img
                    src={m.url}
                    alt={m.filename}
                    className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />

                  {usedBy.length > 0 ? (
                    <span className="absolute top-2 left-2 rounded-full bg-[#5433eb] px-2 py-0.5 text-[10px] text-[#ffffff]">
                      {usedBy.length} SKU
                    </span>
                  ) : (
                    <span className="absolute top-2 left-2 rounded-full bg-[#332f2d] px-2 py-0.5 text-[10px] text-[#ffffff]">
                      Unused
                    </span>
                  )}
                </div>

                <div className="mt-2.5 px-1.5 text-center">
                  <p className="truncate text-[12px] text-[#000000]" title={m.filename}>
                    {m.filename}
                  </p>
                  <p className="text-[10px] text-[#787574] mt-0.5">
                    {formatBytes(m.sizeBytes)}
                  </p>
                </div>
              </div>

              <div className="mt-2.5 flex items-center gap-1.5 px-1 pb-0.5">
                <button
                  type="button"
                  onClick={() => handleCopyPath(m.url)}
                  className="flex-1 inline-flex items-center justify-center gap-1 rounded-full bg-[#f2f4f5] py-1.5 text-[11px] text-[#000000] hover:bg-[#000000] hover:text-[#ffffff] cursor-pointer transition-colors"
                >
                  {isCopied ? <Check size={11} className="text-[#5433eb]" /> : <Copy size={11} />}
                  <span>{isCopied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectImageForNewProduct(m.url)}
                  title="Tạo sản phẩm mới với ảnh này"
                  className="h-7 w-7 shrink-0 rounded-full bg-[#000000] text-[#ffffff] hover:bg-[#5433eb] flex items-center justify-center cursor-pointer transition-colors"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
