export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public domain: string,
    public recoverable: boolean = false,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}
