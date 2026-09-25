export class InputError extends Error {
  readonly kind = 'validation';
  constructor(readonly code: string, readonly path: string, message: string) {
    super(message);
    this.name = 'InputError';
  }
}

export function invalid(code: string, path: string, message: string): never {
  throw new InputError(code, path, message);
}
