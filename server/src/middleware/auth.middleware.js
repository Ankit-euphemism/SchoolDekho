import jwt from "jsonwebtoken";

/**
 * protect
 * Verifies the JWT access token sent in the Authorization header.
 * Attaches the decoded payload as `req.user` on success.
 *
 * Expected header: Authorization: Bearer <token>
 */
export function protect(req, res, next) {
    if (!process.env.JWT_SECRET) {
        return res.status(500).json({ message: "Authentication service is not configured." });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided. Access denied." });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, role, iat, exp }
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expired. Please log in again." });
        }
        return res.status(401).json({ message: "Invalid token. Access denied." });
    }
}
