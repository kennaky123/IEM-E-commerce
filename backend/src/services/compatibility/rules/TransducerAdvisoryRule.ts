import { CompatibilityContext } from '../CompatibilityContext';
import { ICompatibilityRule } from '../ICompatibilityRule';

export class TransducerAdvisoryRule implements ICompatibilityRule {
  readonly name = 'Transducer Slot Advisory';

  evaluate(ctx: CompatibilityContext): void {
    if (ctx.iem && ctx.headphone) {
      ctx.addIssue({
        id: 'dual-transducer-info',
        severity: 'INFO',
        code: 'INFO_DUAL_TRANSDUCER',
        title: 'Dual Transducers Selected (IEM + Headphone)',
        detail: `Both ${ctx.iem.name} and ${ctx.headphone.name} are slotted. Electrical diagnostics reflect the primary IEM unless removed.`,
        affectedCategories: ['IEM', 'HEADPHONE'],
      });
    }

    if (ctx.accessory && !ctx.transducer) {
      ctx.addIssue({
        id: 'accessory-only',
        severity: 'INFO',
        code: 'INFO_NO_TRANSDUCER',
        title: 'Select an IEM or Planar Headphone',
        detail: 'Add a primary transducer to unlock full impedance damping and FR synergy checks.',
        affectedCategories: ['ACCESSORY'],
      });
    }
  }
}
