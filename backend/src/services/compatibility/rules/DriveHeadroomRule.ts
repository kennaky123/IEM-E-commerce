import { CompatibilityContext } from '../CompatibilityContext';
import { ICompatibilityRule } from '../ICompatibilityRule';

export class DriveHeadroomRule implements ICompatibilityRule {
  readonly name = 'Drive Headroom (≥112dB SPL)';

  evaluate(ctx: CompatibilityContext): void {
    if (!ctx.transducer?.specs.sensitivityDb) {
      ctx.addCheck({
        rule: this.name,
        passed: null,
        statusText: 'Awaiting Transducer specs',
      });
      return;
    }

    const sens = ctx.transducer.specs.sensitivityDb;
    const targetSpl = 112;
    const neededMw = Math.pow(10, (targetSpl - sens) / 10);
    const requiredPowerMw = Math.max(5, Math.ceil(neededMw));
    ctx.requiredPowerMw = requiredPowerMw;

    const outputPowerMw = ctx.outputPowerMw;
    if (outputPowerMw === null) {
      ctx.addCheck({
        rule: this.name,
        passed: null,
        statusText: `Needs ${requiredPowerMw}mW+ DAC`,
      });
      return;
    }

    const estimatedSplDb = Math.min(
      138,
      Math.round(sens + 10 * Math.log10(Math.max(1, outputPowerMw)))
    );
    ctx.estimatedSplDb = estimatedSplDb;

    if (sens <= 95 && outputPowerMw < 350) {
      ctx.addIssue({
        id: 'underpowered-planar',
        severity: 'ERROR',
        code: 'ERR_UNDERPOWERED_PLANAR',
        title: `Insufficient Drive for Low-Sensitivity Planar (${outputPowerMw}mW)`,
        detail: `${ctx.transducer.name} (${sens}dB sensitivity) needs >= 350mW clean headroom; ${ctx.dac?.name} delivers ${outputPowerMw}mW.`,
        affectedCategories: ctx.transducerCategory
          ? [ctx.transducerCategory, 'DAC_AMP']
          : ['DAC_AMP'],
      });
      ctx.addCheck({
        rule: this.name,
        passed: false,
        statusText: `Underdriven (${outputPowerMw}mW)`,
      });
      return;
    }

    if (outputPowerMw < requiredPowerMw) {
      ctx.addIssue({
        id: 'tight-headroom',
        severity: 'WARNING',
        code: 'WARN_HEADROOM',
        title: `Limited Amplifier Headroom (${outputPowerMw}mW < ${requiredPowerMw}mW rec.)`,
        detail: `Peak orchestral transients may compress on ${ctx.dac?.name}.`,
        affectedCategories: ['DAC_AMP'],
      });
      ctx.addCheck({
        rule: this.name,
        passed: true,
        statusText: `Tight (${estimatedSplDb}dB peak)`,
      });
      return;
    }

    ctx.addCheck({
      rule: this.name,
      passed: true,
      statusText: `Clean (${estimatedSplDb}dB peak)`,
    });
  }
}
