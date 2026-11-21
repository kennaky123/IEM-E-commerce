import fs from 'node:fs';
import path from 'node:path';
import { BadRequestError } from '../errors/AppError';
import { IProductRepository } from '../interfaces/repositories';

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

export class MediaService {
  constructor(private readonly productRepo: IProductRepository) {}

  private resolveMediaDir(subdir: string): string {
    const candidates = [
      path.resolve(process.cwd(), '..', 'frontend', 'public', 'images', subdir),
      path.resolve(process.cwd(), 'frontend', 'public', 'images', subdir),
    ];
    for (const dir of candidates) {
      if (fs.existsSync(dir)) return dir;
    }
    const primary = candidates[0];
    fs.mkdirSync(primary, { recursive: true });
    return primary;
  }

  private toSuggestedName(filename: string): string {
    const base = path.parse(filename).name;
    return `MOONDROP ${base.replace(/[-_]+/g, ' ').toUpperCase()}`;
  }

  private toSetTitle(folder: string): string {
    return folder
      .replace(/^(tai-nghe-|dac-amp-)/i, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (ch) => ch.toUpperCase());
  }

  listTaingheImages() {
    const dir = this.resolveMediaDir('tainghe');
    const files = fs.readdirSync(dir, { withFileTypes: true });
    const images = files
      .filter((entry) => entry.isFile())
      .filter((entry) =>
        ALLOWED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
      )
      .map((entry) => {
        const stat = fs.statSync(path.join(dir, entry.name));
        return {
          filename: entry.name,
          url: `/images/tainghe/${entry.name}`,
          sizeBytes: stat.size,
          suggestedName: this.toSuggestedName(entry.name),
        };
      })
      .sort((a, b) => a.filename.localeCompare(b.filename));

    return { images, total: images.length };
  }

  async listStudioSonglongSets() {
    const rootDir = this.resolveMediaDir('studio_songlong');
    const folders = fs
      .readdirSync(rootDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name));

    const allProducts = await this.productRepo.findMinimalForMatching();

    let totalImages = 0;
    const sets = folders
      .map((dirEntry) => {
        const folderName = dirEntry.name;
        const folderPath = path.join(rootDir, folderName);
        const images = fs
          .readdirSync(folderPath, { withFileTypes: true })
          .filter((f) => f.isFile())
          .filter((f) =>
            ALLOWED_EXTENSIONS.has(path.extname(f.name).toLowerCase())
          )
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((f) => `/images/studio_songlong/${folderName}/${f.name}`);

        totalImages += images.length;

        const cleanFolder = folderName
          .replace(/^(tai-nghe-|dac-amp-|moondrop-)/gi, '')
          .replace(/-/g, ' ')
          .toLowerCase();
        const tokens = cleanFolder.split(/\s+/).filter((t) => t.length > 1);

        const matchedProduct =
          allProducts.find((p) => {
            const hay = `${p.id} ${p.slug} ${p.name} ${p.sku}`.toLowerCase();
            return tokens.length > 0 && tokens.every((tok) => hay.includes(tok));
          }) ||
          allProducts.find((p) => {
            const hay = `${p.id} ${p.slug} ${p.name}`.toLowerCase();
            return tokens.some((tok) => hay.includes(tok));
          });

        return {
          folder: folderName,
          title: this.toSetTitle(folderName),
          images,
          cover: images[0] ?? '',
          count: images.length,
          productId: matchedProduct?.id ?? null,
          product: matchedProduct
            ? {
                id: matchedProduct.id,
                name: matchedProduct.name,
                price: matchedProduct.price,
                rating: matchedProduct.rating,
                sku: matchedProduct.sku,
              }
            : null,
        };
      })
      .filter((s) => s.images.length > 0);

    return { sets, totalSets: sets.length, totalImages };
  }

  uploadImage(filename?: string, dataUrl?: string) {
    if (!filename?.trim() || !dataUrl?.trim()) {
      throw new BadRequestError('filename and base64 dataUrl are required.');
    }

    const match = /^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/i.exec(
      dataUrl
    );
    if (!match) {
      throw new BadRequestError(
        'Unsupported image dataUrl format (expected PNG, JPEG, WEBP, or GIF).'
      );
    }

    const extFromMime =
      match[1].toLowerCase() === 'jpeg'
        ? '.jpg'
        : `.${match[1].toLowerCase()}`;
    const rawBase = path.parse(filename).name.replace(/[^a-zA-Z0-9_-]+/g, '-');
    const safeBase = rawBase.replace(/^-|-$/g, '') || `upload-${Date.now()}`;
    const origExt = path.extname(filename).toLowerCase();
    const finalExt = ALLOWED_EXTENSIONS.has(origExt) ? origExt : extFromMime;
    const finalName = `${safeBase}${finalExt}`;

    const dir = this.resolveMediaDir('tainghe');
    const dest = path.join(dir, finalName);
    const buffer = Buffer.from(match[2], 'base64');
    fs.writeFileSync(dest, buffer);

    return {
      filename: finalName,
      url: `/images/tainghe/${finalName}`,
      sizeBytes: buffer.length,
      suggestedName: this.toSuggestedName(finalName),
    };
  }
}
