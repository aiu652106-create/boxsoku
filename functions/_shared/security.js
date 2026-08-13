export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy": "frame-ancestors 'self'",
  "X-Permitted-Cross-Domain-Policies": "none"
};

export function securityHeaders(extra = {}) {
  return {
    ...SECURITY_HEADERS,
    ...extra
  };
}
