export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(args: { status: number; code: string; message: string; details?: unknown }) {
    super(args.message);
    this.name = "AppError";
    this.status = args.status;
    this.code = args.code;
    this.details = args.details;
  }
}

export const notImplemented = (route: string) =>
  new AppError({
    status: 501,
    code: "not_implemented",
    message: `Route ${route} is scaffolded but not yet implemented.`,
  });

export const unauthorised = () =>
  new AppError({ status: 401, code: "unauthorised", message: "Missing or invalid session." });

export const forbidden = () =>
  new AppError({ status: 403, code: "forbidden", message: "Not allowed." });

export const notFound = (resource: string) =>
  new AppError({ status: 404, code: "not_found", message: `${resource} not found.` });

export const badRequest = (message: string, details?: unknown) =>
  new AppError({ status: 400, code: "bad_request", message, details });
