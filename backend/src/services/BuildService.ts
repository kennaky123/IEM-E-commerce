import { BadRequestError } from '../errors/AppError';
import { IPresetRepository, IProductRepository } from '../interfaces/repositories';
import { ICompatibilityService } from '../interfaces/services';
import {
  BuildValidationResult,
  ComponentCategory,
  PopulatedPresetBuild,
  Product,
} from '../types';
import { CHAIN_SLOTS } from './compatibility/CompatibilityContext';

export interface CandidateEvaluation {
  product: Product;
  compat: { compatible: boolean; reason?: string };
}

export class BuildService {
  constructor(
    private readonly productRepo: IProductRepository,
    private readonly presetRepo: IPresetRepository,
    private readonly compatibilityService: ICompatibilityService
  ) {}

  private async resolveSlots(
    slots: Partial<Record<ComponentCategory, string | Product | null | undefined>>
  ): Promise<Partial<Record<ComponentCategory, Product>>> {
    const idsToFetch: string[] = [];
    for (const cat of CHAIN_SLOTS) {
      const entry = slots[cat];
      if (typeof entry === 'string' && entry.trim()) {
        idsToFetch.push(entry.trim());
      }
    }

    const productMap = await this.productRepo.findByIds(idsToFetch);
    const resolvedParts: Partial<Record<ComponentCategory, Product>> = {};

    for (const cat of CHAIN_SLOTS) {
      const entry = slots[cat];
      if (typeof entry === 'string' && entry.trim()) {
        const found = productMap.get(entry.trim());
        if (found) resolvedParts[cat] = found;
      } else if (entry && typeof entry === 'object' && 'id' in entry) {
        resolvedParts[cat] = entry as Product;
      }
    }

    return resolvedParts;
  }

  async validateSlots(
    slots: Partial<Record<ComponentCategory, string | Product | null>>
  ): Promise<{
    validation: BuildValidationResult;
    parts: Partial<Record<ComponentCategory, Product>>;
  }> {
    if (!slots || typeof slots !== 'object') {
      throw new BadRequestError('Payload must contain a slots object.');
    }

    const parts = await this.resolveSlots(slots);
    const validation = this.compatibilityService.validateChain(parts);
    return { validation, parts };
  }

  async getPopulatedPresets(): Promise<PopulatedPresetBuild[]> {
    const [products, presetDefs] = await Promise.all([
      this.productRepo.findAll(),
      this.presetRepo.findAll(),
    ]);
    const byId = new Map(products.map((p) => [p.id, p]));

    return presetDefs.map((preset) => {
      const parts: Partial<Record<ComponentCategory, Product>> = {};
      for (const cat of CHAIN_SLOTS) {
        const productId = preset.slots[cat];
        if (!productId) continue;
        const found = byId.get(productId);
        if (found) {
          parts[cat] = found;
        }
      }

      return {
        id: preset.id,
        name: preset.name,
        tagline: preset.tagline,
        targetProfile: preset.targetProfile,
        synergyHint: preset.synergyHint,
        parts,
        validation: this.compatibilityService.validateChain(parts),
      };
    });
  }

  async evaluateCandidates(input: {
    category: ComponentCategory;
    slots?: Partial<Record<ComponentCategory, string | Product | null>>;
    search?: string;
    strictOnly?: boolean;
  }): Promise<CandidateEvaluation[]> {
    if (!input.category || !CHAIN_SLOTS.includes(input.category)) {
      throw new BadRequestError('Valid component category is required.');
    }

    const resolved = input.slots ? await this.resolveSlots(input.slots) : {};
    delete resolved[input.category];

    const candidates = await this.productRepo.findAll({
      category: input.category,
      search: input.search?.trim() || undefined,
    });

    const evaluated = candidates.map((product) => ({
      product,
      compat: this.compatibilityService.checkCandidate(product, resolved),
    }));

    return input.strictOnly
      ? evaluated.filter((entry) => entry.compat.compatible)
      : evaluated;
  }
}
