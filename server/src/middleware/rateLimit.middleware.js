import rateLimit from "express-rate-limit";

function getWindowMs(envKey, fallbackMs) {
    const raw = Number(process.env[envKey]);
    return Number.isFinite(raw) && raw > 0 ? raw : fallbackMs;
}

function getMax(envKey, fallbackMax) {
    const raw = Number(process.env[envKey]);
    return Number.isFinite(raw) && raw > 0 ? raw : fallbackMax;
}

function rateLimitMessage(windowMs) {
    return `Too many requests. Please try again in ${Math.ceil(windowMs / 1000)} seconds.`;
}

const defaultWindowMs = getWindowMs("RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000);
const defaultMax = getMax("RATE_LIMIT_MAX", 400);

export const apiLimiter = rateLimit({
    windowMs: defaultWindowMs,
    limit: defaultMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: rateLimitMessage(defaultWindowMs) },
});

const authWindowMs = getWindowMs("RATE_LIMIT_AUTH_WINDOW_MS", 10 * 60 * 1000);
const authMax = getMax("RATE_LIMIT_AUTH_MAX", 20);

export const authLimiter = rateLimit({
    windowMs: authWindowMs,
    limit: authMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: rateLimitMessage(authWindowMs) },
});

const uploadWindowMs = getWindowMs("RATE_LIMIT_UPLOAD_WINDOW_MS", 10 * 60 * 1000);
const uploadMax = getMax("RATE_LIMIT_UPLOAD_MAX", 30);

export const uploadLimiter = rateLimit({
    windowMs: uploadWindowMs,
    limit: uploadMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: rateLimitMessage(uploadWindowMs) },
});

const reviewWriteWindowMs = getWindowMs("RATE_LIMIT_REVIEW_WRITE_WINDOW_MS", 10 * 60 * 1000);
const reviewWriteMax = getMax("RATE_LIMIT_REVIEW_WRITE_MAX", 40);

export const reviewWriteLimiter = rateLimit({
    windowMs: reviewWriteWindowMs,
    limit: reviewWriteMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: rateLimitMessage(reviewWriteWindowMs) },
});
