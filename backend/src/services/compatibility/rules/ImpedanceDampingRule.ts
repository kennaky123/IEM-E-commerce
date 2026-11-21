import { CompatibilityContext } from '../CompatibilityContext';
import { ICompatibilityRule } from '../ICompatibilityRule';

export class ImpedanceDampingRule implements ICompatibilityRule {
  readonly name = 'Impedance Damping (≥8:1)';

  evaluate(ctx: CompatibilityContext): void {
    if (!ctx.transducer?.specs.impedanceOhms || !ctx.dac) {
      ctx.addCheck({
        rule: this.name,
        passed: null,
        statusText: 'Awaiting Transducer & DAC',
      });
      return;
    }

    const zLoad = ctx.transducer.specs.impedanceOhms;
    const zOut = ctx.dac.specs.outputImpedanceOhms ?? 0.1;
    const ratio = Math.round(zLoad / Math.max(zOut, 0.05));
    ctx.dampingFactor = ratio;

    if (ratio < 8) {
      ctx.addIssue({
        id: 'low-damping',
        severity: 'WARNING',
        code: 'WARN_LOW_DAMPING',
        title: `Low Damping Factor (${ratio}:1)`,
        detail: `${ctx.transducer.name} (${zLoad}Ω) paired with ${ctx.dac.name} (${zOut}Ω out) drops below the 8:1 rule and may alter crossover bass response.`,
        affectedCategories: ctx.transducerCategory
          ? [ctx.transducerCategory, 'DAC_AMP']
          : ['DAC_AMP'],
      });
      ctx.addCheck({
        rule: this.name,
        passed: true,
        statusText: `Tight (${ratio}:1 ratio)`,
      });
      return;
    }

    ctx.addCheck({
      rule: this.name,
      passed: true,
      statusText: `Optimal (${ratio}:1 ratio)`,
    });
  }
}
