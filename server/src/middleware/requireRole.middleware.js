/**
 * requireRole(...roles)
 * Factory that returns middleware restricting access to users whose role
 * is included in the `roles` array.
 *
 * Must be used AFTER the `protect` middleware.
 *
 * @param {...string} roles - Allowed roles, e.g. requireRole("school-admin")
 *
 * @example
 * router.delete("/:id", protect, requireRole("school-admin"), deleteSchool);
 */
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            // protect middleware was not applied before this one
            return res.status(401).json({ message: "Not authenticated." });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Access denied. Required role(s): ${roles.join(", ")}.`,
            });
        }

        next();
    };
}
