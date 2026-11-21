import React, { useEffect, useState } from 'react';
import { Check, CheckCircle2, FileImage, Layers, Sliders, X } from 'lucide-react';
import {
  ComponentCategory,
  MediaImageItem,
  PinType,
  PlugType,
  Product,
  SoundSignature,
} from '../../types';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
  onSave: (data: Partial<Product>) => Promise<void>;
  mediaImages: MediaImageItem[];
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  onSave,
  mediaImages,
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'specs' | 'media'>('basic');
  const [saving, setSaving] = useState(false);

  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('MOONDROP');
  const [category, setCategory] = useState<ComponentCategory>('IEM');
  const [price, setPrice] = useState('3990000');
  const [originalPrice, setOriginalPrice] = useState('');
  const [stock, setStock] = useState('15');
  const [image, setImage] = useState('');
  const [summary, setSummary] = useState('');
  const [featured, setFeatured] = useState(true);

  const [driverConfig, setDriverConfig] = useState('1DD + 2BA Hybrid');
  const [dacChip, setDacChip] = useState('');
  const [soundSignature, setSoundSignature] = useState<SoundSignature>('VDSF Neutral');
  const [pinType, setPinType] = useState<PinType>('0.78mm 2-Pin');
  const [plugType, setPlugType] = useState<PlugType>('4.4mm Balanced');
  const [impedanceOhms, setImpedanceOhms] = useState('16');
  const [sensitivityDb, setSensitivityDb] = useState('120');
  const [outputPowerMw, setOutputPowerMw] = useState('280');
  const [thdPlusN, setThdPlusN] = useState('≤ 0.5% @ 1kHz');
  const [silkscreenText, setSilkscreenText] = useState('VDSF, 0.78MM 2-PIN, 4.4MM BAL');

  const [mediaSearch, setMediaSearch] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('basic');
    if (productToEdit && productToEdit.id) {
      setSku(productToEdit.sku || '');
      setName(productToEdit.name || '');
      setBrand(productToEdit.brand || 'MOONDROP');
      setCategory(productToEdit.category || 'IEM');
      setPrice(String(productToEdit.price || ''));
      setOriginalPrice(productToEdit.originalPrice ? String(productToEdit.originalPrice) : '');
      setStock(String(productToEdit.stock ?? '0'));
      setImage(productToEdit.image || '');
      setSummary(productToEdit.summary || '');
      setFeatured(Boolean(productToEdit.featured));

      setDriverConfig(productToEdit.specs?.driverConfig || '');
      setDacChip(productToEdit.specs?.dacChip || '');
      setSoundSignature(productToEdit.specs?.soundSignature || 'VDSF Neutral');
      setPinType(productToEdit.specs?.pinType || '0.78mm 2-Pin');
      setPlugType(productToEdit.specs?.plugType || '4.4mm Balanced');
      setImpedanceOhms(
        productToEdit.specs?.impedanceOhms !== undefined
          ? String(productToEdit.specs.impedanceOhms)
          : ''
      );
      setSensitivityDb(
        productToEdit.specs?.sensitivityDb !== undefined
          ? String(productToEdit.specs.sensitivityDb)
          : ''
      );
      setOutputPowerMw(
        productToEdit.specs?.outputPowerMw !== undefined
          ? String(productToEdit.specs.outputPowerMw)
          : ''
      );
      setThdPlusN(productToEdit.specs?.thdPlusN || '');
      setSilkscreenText((productToEdit.specs?.silkscreenLabels || []).join(', '));
    } else {
      const presetImg = productToEdit?.image || mediaImages[0]?.url || '';
      setSku(productToEdit?.sku || `MD-IEM-${Math.floor(100 + Math.random() * 900)}`);
      setName(productToEdit?.name || '');
      setBrand('MOONDROP');
      setCategory('IEM');
      setPrice('3990000');
      setOriginalPrice('');
      setStock('15');
      setImage(presetImg);
      setSummary('');
      setFeatured(true);
      setDriverConfig('1DD + 2BA Hybrid');
      setDacChip('');
      setSoundSignature('VDSF Neutral');
      setPinType('0.78mm 2-Pin');
      setPlugType('4.4mm Balanced');
      setImpedanceOhms('16');
      setSensitivityDb('120');
      setOutputPowerMw('280');
      setThdPlusN('≤ 0.5% @ 1kHz');
      setSilkscreenText('VDSF, 0.78MM 2-PIN, 4.4MM BAL');
    }
  }, [productToEdit, isOpen, mediaImages]);

  if (!isOpen) return null;

  const isEditing = Boolean(productToEdit && productToEdit.id);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Partial<Product> = {
        sku,
        name,
        brand,
        category,
        price: Number(price) || 0,
        originalPrice: originalPrice ? Number(originalPrice) : undefined,
        stock: Number(stock) || 0,
        image,
        summary,
        featured,
        specs: {
          driverConfig,
          dacChip: dacChip || undefined,
          soundSignature,
          pinType: category === 'IEM' || category === 'CABLE' ? pinType : undefined,
          plugType: category === 'CABLE' || category === 'DAC_AMP' ? plugType : undefined,
          impedanceOhms: impedanceOhms ? Number(impedanceOhms) : undefined,
          sensitivityDb: sensitivityDb ? Number(sensitivityDb) : undefined,
          outputPowerMw: outputPowerMw ? Number(outputPowerMw) : undefined,
          thdPlusN,
          silkscreenLabels: silkscreenText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        },
      };

      await onSave(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const filteredMedia = mediaImages.filter((m) =>
    m.filename.toLowerCase().includes(mediaSearch.toLowerCase())
  );

  const inputClass =
    'mt-1.5 w-full rounded-[20px] border border-[#ebebeb] bg-[#f2f4f5] px-4 py-2.5 text-[14px] tracking-[-0.014em] text-[#000000] placeholder:text-[#787574] focus:bg-[#ffffff] focus:border-[#5433eb] focus:outline-none transition-colors';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000]/45 backdrop-blur-[4px] p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative my-8 flex max-h-[90vh] w-full max-w-3xl flex-col shop-card rounded-[28px] bg-[#ffffff] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#ebebeb] px-6 py-5">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#f2f4f5] px-3 py-0.5 text-[11.5px] tracking-[-0.017em] text-[#787574]">
              <span className="h-2 w-2 rounded-full bg-[#5433eb]" />
              <span>{isEditing ? `SKU ${productToEdit?.sku}` : 'New hardware SKU'}</span>
            </span>
            <h3 className="mt-2 text-[22px] leading-none tracking-[-0.05em] text-[#000000]">
              {isEditing ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới vào kho'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#f2f4f5] px-3.5 py-1.5 text-[12px] tracking-[-0.017em] text-[#000000] hover:bg-[#ebebeb] cursor-pointer inline-flex items-center gap-1"
          >
            <X size={14} />
            <span>Close</span>
          </button>
        </div>

        {/* Pill Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#ebebeb] bg-[#f2f4f5]/60 px-6 py-3">
          {(
            [
              { id: 'basic', label: 'Thông tin cơ bản', icon: <Layers size={14} /> },
              { id: 'specs', label: 'Thông số kỹ thuật', icon: <Sliders size={14} /> },
              {
                id: 'media',
                label: `Chọn ảnh (${mediaImages.length})`,
                icon: <FileImage size={14} />,
              },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[12.5px] tracking-[-0.017em] cursor-pointer transition-all ${
                  active
                    ? 'bg-[#000000] text-[#ffffff]'
                    : 'bg-[#ffffff] text-[#787574] border border-[#ebebeb] hover:text-[#000000]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] tracking-[-0.017em] text-[#787574] px-1">
                    Tên sản phẩm *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="VD: MOONDROP Blessing 3"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-[12px] tracking-[-0.017em] text-[#787574] px-1">
                    Mã SKU *
                  </label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[12px] tracking-[-0.017em] text-[#787574] px-1">
                    Danh mục
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ComponentCategory)}
                    className={inputClass}
                  >
                    <option value="IEM">Tai nghe IEM</option>
                    <option value="DAC_AMP">Bộ giải mã DAC/AMP</option>
                    <option value="HEADPHONE">Tai nghe Planar</option>
                    <option value="CABLE">Dây nâng cấp Litz</option>
                    <option value="ACCESSORY">Phụ kiện âm thanh</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] tracking-[-0.017em] text-[#787574] px-1">
                    Thương hiệu
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-[12px] tracking-[-0.017em] text-[#787574] px-1">
                    Số lượng tồn kho
                  </label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    required
                    min="0"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] tracking-[-0.017em] text-[#787574] px-1">
                    Giá bán thực tế (VND) *
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    min="0"
                    step="10000"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-[12px] tracking-[-0.017em] text-[#787574] px-1">
                    Giá gốc niêm yết (VND)
                  </label>
                  <input
                    type="number"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    min="0"
                    step="10000"
                    placeholder="4500000"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] tracking-[-0.017em] text-[#787574] px-1">
                  Mô tả ngắn
                </label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={2}
                  placeholder="Mô tả cấu trúc âm học, chất âm, vật liệu..."
                  className={inputClass}
                />
              </div>

              <label className="inline-flex items-center gap-2.5 rounded-full bg-[#f2f4f5] px-4 py-2 text-[13px] tracking-[-0.014em] text-[#000000] cursor-pointer">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="h-4 w-4 accent-[#5433eb]"
                />
                <span>Đánh dấu sản phẩm Flagship nổi bật</span>
              </label>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] tracking-[-0.017em] text-[#787574] px-1">
                    Cấu hình củ loa / Driver
                  </label>
                  <input
                    type="text"
                    value={driverConfig}
                    onChange={(e) => setDriverConfig(e.target.value)}
                    placeholder="VD: 2DD + 4BA + 2EST"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-[12px] tracking-[-0.017em] text-[#787574] px-1">
                    Chip giải mã DAC
                  </label>
                  <input
                    type="text"
                    value={dacChip}
                    onChange={(e) => setDacChip(e.target.value)}
                    placeholder="VD: Dual CS43131"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[12px] tracking-[-0.017em] text-[#787574] px-1">
                    Sound Signature
                  </label>
                  <select
                    value={soundSignature}
                    onChange={(e) => setSoundSignature(e.target.value as SoundSignature)}
                    className={inputClass}
                  >
                    <option value="VDSF Neutral">VDSF Neutral</option>
                    <option value="Harman Sub-Bass">Harman Sub-Bass</option>
                    <option value="Studio Reference">Studio Reference</option>
                    <option value="Warm Musical">Warm Musical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] tracking-[-0.017em] text-[#787574] px-1">
                    Chuẩn chân cắm (Pin)
                  </label>
                  <select
                    value={pinType}
                    onChange={(e) => setPinType(e.target.value as PinType)}
                    className={inputClass}
                  >
                    <option value="0.78mm 2-Pin">0.78mm 2-Pin</option>
                    <option value="MMCX">MMCX</option>
                    <option value="Dual 3.5mm">Dual 3.5mm</option>
                    <option value="Fixed">Fixed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] tracking-[-0.017em] text-[#787574] px-1">
                    Chuẩn jack (Plug)
                  </label>
                  <select
                    value={plugType}
                    onChange={(e) => setPlugType(e.target.value as PlugType)}
                    className={inputClass}
                  >
                    <option value="4.4mm Balanced">4.4mm Balanced</option>
                    <option value="3.5mm SE">3.5mm SE</option>
                    <option value="6.35mm SE">6.35mm SE</option>
                    <option value="USB-C">USB-C</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[12px] tracking-[-0.017em] text-[#787574] px-1">
                    Trở kháng (Ω)
                  </label>
                  <input
                    type="number"
                    value={impedanceOhms}
                    onChange={(e) => setImpedanceOhms(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-[12px] tracking-[-0.017em] text-[#787574] px-1">
                    Độ nhạy (dB)
                  </label>
                  <input
                    type="number"
                    value={sensitivityDb}
                    onChange={(e) => setSensitivityDb(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-[12px] tracking-[-0.017em] text-[#787574] px-1">
                    Công suất (mW @ 32Ω)
                  </label>
                  <input
                    type="number"
                    value={outputPowerMw}
                    onChange={(e) => setOutputPowerMw(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-[20px] bg-[#f2f4f5] p-3">
                {image ? (
                  <img
                    src={image}
                    alt="Selected"
                    className="h-14 w-14 shrink-0 rounded-[14px] bg-[#ffffff] p-1 object-contain"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-[#ffffff] text-[11px] text-[#787574]">
                    Empty
                  </div>
                )}
                <input
                  type="text"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="/images/tainghe/..."
                  className="flex-1 bg-transparent text-[13px] text-[#000000] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-[12.5px] tracking-[-0.017em] text-[#787574]">
                  Chọn từ thư viện ({filteredMedia.length} ảnh)
                </span>
                <input
                  type="text"
                  value={mediaSearch}
                  onChange={(e) => setMediaSearch(e.target.value)}
                  placeholder="Lọc tên ảnh..."
                  className="rounded-full border border-[#ebebeb] bg-[#f2f4f5] px-3.5 py-1.5 text-[12px] text-[#000000] focus:bg-[#ffffff] focus:border-[#5433eb] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 max-h-56 overflow-y-auto p-1">
                {filteredMedia.map((m) => {
                  const isSelected = image === m.url;
                  return (
                    <button
                      type="button"
                      key={m.filename}
                      onClick={() => setImage(m.url)}
                      className={`relative rounded-[20px] p-1.5 text-center cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#ffffff] ring-2 ring-[#5433eb] shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                          : 'bg-[#f2f4f5] hover:bg-[#ebebeb]'
                      }`}
                    >
                      <img
                        src={m.url}
                        alt={m.filename}
                        className="h-16 w-full rounded-[14px] bg-[#ffffff] object-contain p-1"
                      />
                      <p className="mt-1 truncate text-[10px] text-[#787574]">{m.filename}</p>
                      {isSelected && (
                        <span className="absolute top-2 right-2 rounded-full bg-[#5433eb] p-0.5 text-[#ffffff]">
                          <Check size={10} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 border-t border-[#ebebeb] pt-4 mt-4">
            <button type="button" onClick={onClose} className="sl-btn-light text-[13px]">
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-[#5433eb] px-6 py-2.5 text-[13px] tracking-[-0.014em] text-[#ffffff] shadow-[0_4px_24px_rgba(69,36,219,0.34)] hover:bg-[#4524db] inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer transition-all"
            >
              <CheckCircle2 size={15} />
              <span>{saving ? 'Đang lưu...' : isEditing ? 'Cập nhật SKU' : 'Tạo SKU mới'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
