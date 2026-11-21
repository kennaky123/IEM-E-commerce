export abstract class BaseMongoRepository<T> {
  protected stripDoc<R = T>(doc: unknown): R | null {
    if (!doc || typeof doc !== 'object') return null;
    const { _id, ...rest } = doc as Record<string, unknown>;
    void _id;
    return rest as R;
  }

  protected stripDocs<R = T>(docs: unknown[]): R[] {
    return docs
      .map((doc) => this.stripDoc<R>(doc))
      .filter((item): item is R => item !== null);
  }

  protected escapeRegex(text: string): string {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  }
}
