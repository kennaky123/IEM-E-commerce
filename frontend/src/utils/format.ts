import { ComponentCategory, Product } from '../types';

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatShortVND(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M₫`;
  }
  return formatVND(amount);
}

export const CATEGORY_ORDER: ComponentCategory[] = [
  'IEM',
  'DAC_AMP',
  'HEADPHONE',
  'CABLE',
  'ACCESSORY',
];

export const CATEGORY_META: Record<
  ComponentCategory,
  { serial: string; label: string; shortLabel: string; description: string }
> = {
  IEM: {
    serial: 'SL-01',
    label: 'IN-EAR MONITORS',
    shortLabel: 'IEM',
    description: 'Tribrid EST, Planar, and VDSF dynamic reference monitors.',
  },
  DAC_AMP: {
    serial: 'SL-02',
    label: 'DAC / AMPLIFIERS',
    shortLabel: 'DAC / AMP',
    description: 'Dual Cirrus Logic & ESS decoding stages with 4.4mm balanced output.',
  },
  HEADPHONE: {
    serial: 'SL-03',
    label: 'PLANAR HEADPHONES',
    shortLabel: 'HEADPHONE',
    description: '100mm nanoscale planar magnetic & open-back studio transducers.',
  },
  CABLE: {
    serial: 'SL-04',
    label: 'INTERCONNECT CABLES',
    shortLabel: 'CABLE',
    description: '8-strand Litz OCC & coaxial balanced 0.78mm / MMCX terminations.',
  },
  ACCESSORY: {
    serial: 'SL-05',
    label: 'ACOUSTIC ACCESSORIES',
    shortLabel: 'ACCESSORY',
    description: 'Resonance-damping Spring Tips and 200-mesh nozzle filters.',
  },
};

export function extractSilkscreenTags(product: Product): string[] {
  if (product.specs.silkscreenLabels && product.specs.silkscreenLabels.length > 0) {
    return product.specs.silkscreenLabels.slice(0, 4);
  }
  const s = product.specs;
  const tags: string[] = [];
  if (s.driverConfig) tags.push(s.driverConfig);
  if (s.dacChip) tags.push(s.dacChip);
  if (s.impedanceOhms) tags.push(`${s.impedanceOhms}Ω`);
  if (s.outputPowerMw) tags.push(`${s.outputPowerMw}MW`);
  if (s.pinType) tags.push(s.pinType);
  if (s.plugType) tags.push(s.plugType);
  return tags.slice(0, 4);
}

export function extractDetailedSpecRows(
  product: Product
): Array<{ label: string; value: string; note: string }> {
  const s = product.specs;
  const rows: Array<{ label: string; value: string; note: string }> = [];

  rows.push({
    label: 'SERIAL SKU',
    value: product.sku,
    note: `${product.brand} FACTORY IDENTIFIER`,
  });

  if (s.driverConfig) {
    rows.push({
      label: 'TRANSDUCER TOPOLOGY',
      value: s.driverConfig,
      note: 'Acoustic driver architecture',
    });
  }
  if (s.dacChip) {
    rows.push({
      label: 'DECODING ARCHITECTURE',
      value: s.dacChip,
      note: 'Digital-to-analog conversion stage',
    });
  }
  if (s.soundSignature) {
    rows.push({
      label: 'TARGET CURVE',
      value: s.soundSignature.toUpperCase(),
      note: 'B&K 5128 / IEC61094 acoustic tuning',
    });
  }
  if (s.impedanceOhms) {
    rows.push({
      label: 'NOMINAL IMPEDANCE',
      value: `${s.impedanceOhms} Ω`,
      note: 'Rated electrical load @ 1kHz',
    });
  }
  if (s.outputImpedanceOhms !== undefined) {
    rows.push({
      label: 'OUTPUT IMPEDANCE',
      value: `${s.outputImpedanceOhms} Ω`,
      note: 'Damping factor baseline',
    });
  }
  if (s.sensitivityDb) {
    rows.push({
      label: 'SENSITIVITY',
      value: `${s.sensitivityDb} dB`,
      note: 'SPL @ 1Vrms / 1kHz',
    });
  }
  if (s.outputPowerMw) {
    rows.push({
      label: 'MAX OUTPUT POWER',
      value: `${s.outputPowerMw} mW @ 32Ω`,
      note: 'Balanced amplification headroom',
    });
  }
  if (s.thdPlusN) {
    rows.push({
      label: 'THD + N',
      value: s.thdPlusN,
      note: 'Total harmonic distortion plus noise',
    });
  }
  if (s.frequencyRange) {
    rows.push({
      label: 'FREQUENCY RESPONSE',
      value: s.frequencyRange,
      note: 'Measured acoustic bandwidth',
    });
  }
  if (s.pinType) {
    rows.push({
      label: 'CONNECTOR PIN',
      value: s.pinType.toUpperCase(),
      note: 'Detachable transducer socket standard',
    });
  }
  if (s.plugType) {
    rows.push({
      label: 'TERMINATION PLUG',
      value: s.plugType.toUpperCase(),
      note: 'Signal jack geometry',
    });
  }
  if (s.supportedOutputs && s.supportedOutputs.length > 0) {
    rows.push({
      label: 'SUPPORTED JACKS',
      value: s.supportedOutputs.join(' / ').toUpperCase(),
      note: 'Physical output terminations',
    });
  }
  if (s.cavityMaterial) {
    rows.push({
      label: 'CAVITY MATERIAL',
      value: s.cavityMaterial.toUpperCase(),
      note: 'Acoustic housing & resonance damping shell',
    });
  }
  if (s.diaphragmMaterial) {
    rows.push({
      label: 'DIAPHRAGM MEMBRANE',
      value: s.diaphragmMaterial.toUpperCase(),
      note: 'Transducer cone / film substrate',
    });
  }
  if (s.crossoverType) {
    rows.push({
      label: 'CROSSOVER NETWORK',
      value: s.crossoverType.toUpperCase(),
      note: 'Frequency division & phase alignment topology',
    });
  }
  if (s.cableMaterial) {
    rows.push({
      label: 'CABLE CONDUCTOR',
      value: s.cableMaterial.toUpperCase(),
      note: 'Litz braid core purity & shielding geometry',
    });
  }
  if (s.weightGrams) {
    rows.push({
      label: 'NET WEIGHT',
      value: `${s.weightGrams} G`,
      note: 'Measured chassis mass per unit / pair',
    });
  }
  if (s.warrantyMonths) {
    rows.push({
      label: 'WARRANTY',
      value: `${s.warrantyMonths} MONTHS`,
      note: 'Authorized distributor service',
    });
  }

  return rows;
}
