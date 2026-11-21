import { ICompatibilityService } from '../../interfaces/services';
import {
  BuildValidationResult,
  ComponentCategory,
  Product,
} from '../../types';
import { CompatibilityContext } from './CompatibilityContext';
import { ICompatibilityRule } from './ICompatibilityRule';
import { DriveHeadroomRule } from './rules/DriveHeadroomRule';
import { ImpedanceDampingRule } from './rules/ImpedanceDampingRule';
import { OutputJackRule } from './rules/OutputJackRule';
import { PinConnectorRule } from './rules/PinConnectorRule';
import { TransducerAdvisoryRule } from './rules/TransducerAdvisoryRule';

export class CompatibilityService implements ICompatibilityService {
  private readonly rules: ICompatibilityRule[];

  constructor(
    rules: ICompatibilityRule[] = [
      new PinConnectorRule(),
      new OutputJackRule(),
      new ImpedanceDampingRule(),
      new DriveHeadroomRule(),
      new TransducerAdvisoryRule(),
    ]
  ) {
    this.rules = rules;
  }

  validateChain(
    parts: Partial<Record<ComponentCategory, Product | undefined | null>>
  ): BuildValidationResult {
    const ctx = new CompatibilityContext(parts);

    for (const rule of this.rules) {
      rule.evaluate(ctx);
    }

    const totalPrice = ctx.selectedProducts.reduce(
      (sum, item) => sum + item.price,
      0
    );
    const selectedCount = ctx.selectedProducts.length;
    const totalSlots = 4;
    const completenessPercent = Math.min(
      100,
      Math.round((selectedCount / totalSlots) * 100)
    );
    const averageScore =
      selectedCount > 0
        ? Math.round(
            ctx.selectedProducts.reduce(
              (sum, item) => sum + item.performanceScore,
              0
            ) / selectedCount
          )
        : 0;

    let performanceTier = 'UNCONFIGURED';
    if (selectedCount > 0) {
      if (averageScore >= 94) performanceTier = 'FLAGSHIP REFERENCE';
      else if (averageScore >= 87) performanceTier = 'STUDIO MONITOR';
      else if (averageScore >= 80) performanceTier = 'HI-FI PORTABLE';
      else performanceTier = 'ENTRY VDSF';
    }

    return {
      isCompatible: !ctx.issues.some((i) => i.severity === 'ERROR'),
      hasWarnings: ctx.issues.some((i) => i.severity === 'WARNING'),
      estimatedSplDb: ctx.estimatedSplDb,
      dampingFactor: ctx.dampingFactor,
      outputPowerMw: ctx.outputPowerMw,
      requiredPowerMw: ctx.requiredPowerMw,
      activeTermination: ctx.activeTermination,
      totalPrice,
      selectedCount,
      totalSlots,
      completenessPercent,
      performanceTier,
      averageScore,
      issues: ctx.issues,
      checks: ctx.checks,
    };
  }

  checkCandidate(
    candidate: Product,
    currentParts: Partial<Record<ComponentCategory, Product | undefined | null>>
  ): { compatible: boolean; reason?: string } {
    const testChain: Partial<
      Record<ComponentCategory, Product | undefined | null>
    > = {
      ...currentParts,
      [candidate.category]: candidate,
    };

    const result = this.validateChain(testChain);
    const relevantError = result.issues.find(
      (issue) =>
        issue.severity === 'ERROR' &&
        issue.affectedCategories.includes(candidate.category)
    );

    if (relevantError) {
      return { compatible: false, reason: relevantError.title };
    }
    return { compatible: true };
  }

  findCompatiblePairings(
    target: Product,
    catalog: Product[],
    limit = 3
  ): Product[] {
    return catalog
      .filter((p) => p.id !== target.id && p.category !== target.category)
      .filter(
        (p) =>
          this.checkCandidate(p, { [target.category]: target }).compatible
      )
      .slice(0, limit);
  }
}
