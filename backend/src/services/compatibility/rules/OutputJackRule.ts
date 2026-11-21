import { PlugType } from '../../../types';
import { CompatibilityContext } from '../CompatibilityContext';
import { ICompatibilityRule } from '../ICompatibilityRule';

export class OutputJackRule implements ICompatibilityRule {
  readonly name = 'Termination ↔ DAC Output';

  evaluate(ctx: CompatibilityContext): void {
    if (!ctx.dac || !ctx.activeTermination) {
      ctx.addCheck({
        rule: this.name,
        passed: null,
        statusText: ctx.activeTermination
          ? `Target plug: ${ctx.activeTermination}`
          : 'Awaiting DAC/AMP & Plug',
      });
      return;
    }

    const supportedOutputs = ctx.dac.specs.supportedOutputs ?? [];
    if (
      supportedOutputs.length > 0 &&
      !supportedOutputs.includes(ctx.activeTermination as PlugType)
    ) {
      ctx.addIssue({
        id: 'jack-mismatch',
        severity: 'ERROR',
        code: 'ERR_JACK_MISMATCH',
        title: `Output Jack Incompatible (${ctx.activeTermination})`,
        detail: `Chain terminates in ${ctx.activeTermination}, but ${ctx.dac.name} only provides [${supportedOutputs.join(', ')}].`,
        affectedCategories: ctx.cable
          ? ['DAC_AMP', 'CABLE']
          : ctx.transducerCategory
          ? ['DAC_AMP', ctx.transducerCategory]
          : ['DAC_AMP'],
      });
      ctx.addCheck({
        rule: this.name,
        passed: false,
        statusText: `No ${ctx.activeTermination} port`,
      });
      return;
    }

    ctx.addCheck({
      rule: this.name,
      passed: true,
      statusText: `Locked (${ctx.activeTermination})`,
    });
  }
}
