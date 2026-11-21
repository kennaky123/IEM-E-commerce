import { NextFunction, Request, Response } from 'express';

export type AsyncRouteHandler<Req extends Request = Request> = (
  req: Req,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

export abstract class BaseController {
  protected handle<Req extends Request = Request>(fn: AsyncRouteHandler<Req>) {
    return (req: Request, res: Response, next: NextFunction): void => {
      Promise.resolve(fn(req as Req, res, next)).catch(next);
    };
  }
}
