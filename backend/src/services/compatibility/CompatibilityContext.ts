import {
  CompatibilityIssue,
  CompatibilityRuleCheck,
  ComponentCategory,
  Product,
} from '../../types';

export const CHAIN_SLOTS: ComponentCategory[] = [
  'IEM',
  'HEADPHONE',
  'CABLE',
  'DAC_AMP',
  'ACCESSORY',
];

export class CompatibilityContext {
  readonly iem?: Product;
  readonly headphone?: Product;
  readonly cable?: Product;
  readonly dac?: Product;
  readonly accessory?: Product;
  readonly transducer?: Product;
  readonly transducerCategory: ComponentCategory | null;
  readonly selectedProducts: Product[];
  readonly activeTermination: string | null;

  readonly issues: CompatibilityIssue[] = [];
  readonly checks: CompatibilityRuleCheck[] = [];

  dampingFactor: number | null = null;
  outputPowerMw: number | null = null;
  requiredPowerMw: number | null = null;
  estimatedSplDb: number | null = null;

  constructor(
    parts: Partial<Record<ComponentCategory, Product | undefined | null>>
  ) {
    this.iem = parts.IEM ?? undefined;
    this.headphone = parts.HEADPHONE ?? undefined;
    this.cable = parts.CABLE ?? undefined;
    this.dac = parts.DAC_AMP ?? undefined;
    this.accessory = parts.ACCESSORY ?? undefined;

    this.transducer = this.iem ?? this.headphone;
    this.transducerCategory = this.iem
      ? 'IEM'
      : this.headphone
      ? 'HEADPHONE'
      : null;

    this.selectedProducts = CHAIN_SLOTS.map((slot) => parts[slot]).filter(
      (item): item is Product => Boolean(item)
    );

    this.activeTermination =
      this.cable?.specs.plugType ?? this.transducer?.specs.plugType ?? null;
    this.outputPowerMw = this.dac?.specs.outputPowerMw ?? null;
  }

  addIssue(issue: CompatibilityIssue): void {
    this.issues.push(issue);
  }

  addCheck(check: CompatibilityRuleCheck): void {
    this.checks.push(check);
  }
}
