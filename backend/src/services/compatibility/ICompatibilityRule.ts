import { CompatibilityContext } from './CompatibilityContext';

export interface ICompatibilityRule {
  readonly name: string;
  evaluate(ctx: CompatibilityContext): void;
}
