import { Request, Response } from 'express';
import { MediaService } from '../services/MediaService';
import { BaseController } from './BaseController';

export class MediaController extends BaseController {
  constructor(private readonly mediaService: MediaService) {
    super();
  }

  listTainghe = this.handle((_req: Request, res: Response) => {
    const result = this.mediaService.listTaingheImages();
    res.json(result);
  });

  listStudioSonglong = this.handle(async (_req: Request, res: Response) => {
    const result = await this.mediaService.listStudioSonglongSets();
    res.json(result);
  });

  upload = this.handle((req: Request, res: Response) => {
    const { filename, dataUrl } = req.body as {
      filename?: string;
      dataUrl?: string;
    };
    const uploaded = this.mediaService.uploadImage(filename, dataUrl);
    res.status(201).json(uploaded);
  });
}
