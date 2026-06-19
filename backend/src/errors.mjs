export class HttpError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

export function notFound(message = "Resource not found.") {
  return new HttpError(404, message);
}

export function unauthorized(message = "Authentication is required.") {
  return new HttpError(401, message);
}

export function forbidden(message = "You do not have permission to perform this action.") {
  return new HttpError(403, message);
}

export function conflict(message = "Resource already exists.") {
  return new HttpError(409, message);
}

export function validationError(details) {
  return new HttpError(400, "Validation failed.", details);
}
