import { CompatibilityContext } from '../CompatibilityContext';
import { ICompatibilityRule } from '../ICompatibilityRule';

export class PinConnectorRule implements ICompatibilityRule {
  readonly name = 'Transducer ↔ Cable Pin';

  evaluate(ctx: CompatibilityContext): void {
    if (!ctx.transducer || !ctx.cable || !ctx.transducerCategory) {
      ctx.addCheck({
        rule: this.name,
        passed: null,
        statusText: 'Awaiting IEM/Headphone & Cable',
      });
      return;
    }

    const tPin = ctx.transducer.specs.pinType;
    const cPin = ctx.cable.specs.pinType;

    if (tPin && cPin && tPin !== cPin) {
      ctx.addIssue({
        id: 'pin-mismatch',
        severity: 'ERROR',
        code: 'ERR_PIN_MISMATCH',
        title: `Connector Pin Conflict (${tPin} vs ${cPin})`,
        detail: `${ctx.transducer.name} uses ${tPin} sockets, incompatible with ${ctx.cable.name} (${cPin}).`,
        affectedCategories: [ctx.transducerCategory, 'CABLE'],
      });
      ctx.addCheck({
        rule: this.name,
        passed: false,
        statusText: `Conflict: ${tPin} ≠ ${cPin}`,
      });
      return;
    }

    ctx.addCheck({
      rule: this.name,
      passed: true,
      statusText: `Matched (${tPin || cPin || 'OK'})`,
    });
  }
}
