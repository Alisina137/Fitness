import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { logger } from "../lib/logger";

/**
 * Terminal 404 handler for requests that matched no route. Registered after
 * all routers so unknown paths get a consistent JSON body instead of Express's
 * default HTML response.
 */
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
};

interface HttpError extends Error {
  status?: number;
  statusCode?: number;
}

function statusFor(err: HttpError): number {
  const raw = err.status ?? err.statusCode;
  if (typeof raw === "number" && raw >= 400 && raw <= 599) {
    return raw;
  }
  return 500;
}

/**
 * Global error handler. Express 5 forwards any error thrown or rejected inside
 * a route handler here, so every async route is covered without per-handler
 * try/catch. Guarantees errors are logged (structured, with request context)
 * and answered with a consistent JSON shape, and never leaks internal details
 * or stack traces to clients on 5xx responses.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // If the response has already started streaming, we cannot change the status
  // code or body — defer to Express's default handler to close the connection.
  if (res.headersSent) {
    next(err);
    return;
  }

  const log = req.log ?? logger;

  if (err instanceof ZodError) {
    log.warn({ err }, "Request validation failed");
    res.status(400).json({
      error: "Validation failed",
      details: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  const httpErr = (err ?? new Error("Unknown error")) as HttpError;
  const status = statusFor(httpErr);

  if (status >= 500) {
    log.error({ err }, "Unhandled error while processing request");
  } else {
    log.warn({ err }, "Request failed");
  }

  // Do not expose internal error messages/stack traces for server errors.
  const message =
    status >= 500
      ? "Internal Server Error"
      : httpErr.message || "Request failed";

  res.status(status).json({ error: message });
};
