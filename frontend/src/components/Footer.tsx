import React, { useEffect, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { api } from '../services/api';
import { Coupon } from '../types';
import { formatShortVND } from '../utils/format';

export const Footer: React.FC = () => {
  const { navigate, dbMode } = useStore();
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  useEffect(() => {
    api
      .getActiveCoupons()
      .then((res) => setCoupons(res.coupons))
      .catch(() => setCoupons([]));
  }, []);

  return (
    <footer className="w-full bg-[#000000] text-[#ffffff]">
      <div className="mx-auto max-w-[1200px] px-5 py-16 md:py-20">
        <div className="grid grid-cols-2 gap-y-10 gap-x-8 md:grid-cols-4">
          {/* Column 1 */}
          <div className="flex flex-col gap-3">
            <div className="text-[14px] tracking-[-0.02em] text-[#ffffff]">
              Categories
            </div>
            <button
              type="button"
              onClick={() => navigate('/products?category=IEM')}
              className="sl-body text-left text-[#cccccc] hover:text-[#ffffff] cursor-pointer"
            >
              In-Ear Monitors
            </button>
            <button
              type="button"
              onClick={() => navigate('/products?category=DAC_AMP')}
              className="sl-body text-left text-[#cccccc] hover:text-[#ffffff] cursor-pointer"
            >
              DAC &amp; Amplifiers
            </button>
            <button
              type="button"
              onClick={() => navigate('/products?category=HEADPHONE')}
              className="sl-body text-left text-[#cccccc] hover:text-[#ffffff] cursor-pointer"
            >
              Planar Headphones
            </button>
            <button
              type="button"
              onClick={() => navigate('/products?category=CABLE')}
              className="sl-body text-left text-[#cccccc] hover:text-[#ffffff] cursor-pointer"
            >
              Litz Upgrade Cables
            </button>
          </div>

          {/* Column 2 */}
          <div className="flex flex-col gap-3">
            <div className="text-[14px] tracking-[-0.02em] text-[#ffffff]">
              Engineering
            </div>
            <button
              type="button"
              onClick={() => navigate('/chain-builder')}
              className="sl-body text-left text-[#cccccc] hover:text-[#ffffff] cursor-pointer"
            >
              Signal Chain Lab
            </button>
            <button
              type="button"
              onClick={() => navigate('/technology')}
              className="sl-body text-left text-[#cccccc] hover:text-[#ffffff] cursor-pointer"
            >
              VDSF Target Response
            </button>
            <button
              type="button"
              onClick={() => navigate('/compare')}
              className="sl-body text-left text-[#cccccc] hover:text-[#ffffff] cursor-pointer"
            >
              FR Curve Compare
            </button>
          </div>

          {/* Column 3 */}
          <div className="flex flex-col gap-3">
            <div className="text-[14px] tracking-[-0.02em] text-[#ffffff]">
              Shopping &amp; Offers
            </div>
            <button
              type="button"
              onClick={() => navigate('/orders')}
              className="sl-body text-left text-[#cccccc] hover:text-[#ffffff] cursor-pointer"
            >
              Order Tracking
            </button>
            {coupons.map((coupon) => (
              <span key={coupon.code} className="sl-body text-[#787574]">
                Code: {coupon.code} (
                {coupon.type === 'PERCENTAGE'
                  ? `-${coupon.value}%`
                  : `-${formatShortVND(coupon.value)}`}
                )
              </span>
            ))}
          </div>

          {/* Column 4 */}
          <div className="flex flex-col gap-3">
            <div className="text-[14px] tracking-[-0.02em] text-[#ffffff] flex items-center gap-2">
              <span className="text-[#5433eb] text-[18px] tracking-[-0.05em]">
                shop.
              </span>
              <span>Acoustic Lab</span>
            </div>
            <span className="sl-body text-[#787574]">IEC61094 / B&amp;K 5128</span>
            <span className="sl-body text-[#787574]">
              Database: {dbMode === 'mongodb' ? 'MongoDB Atlas Live' : 'Offline'}
            </span>
            <span className="sl-body text-[#787574]">
              React 19 · Tailwind v4 · Three.js · GSAP
            </span>
          </div>
        </div>

        {/* Bottom Legal Strip */}
        <div className="mt-14 border-t border-[#ffffff]/15 pt-6 flex flex-wrap items-center justify-between gap-4">
          <span className="sl-label text-[#787574]">
            © 2026 Moondrop Acoustic Audio Store · Floating Shopping Constellation
          </span>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#332f2d] px-3 py-1 text-[11px] text-[#cccccc]">
              Studio SongLong 32 Sets
            </span>
            <span className="rounded-full bg-[#5433eb] px-3 py-1 text-[11px] text-[#ffffff]">
              MongoDB Synced
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
