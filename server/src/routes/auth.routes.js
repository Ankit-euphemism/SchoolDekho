import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.models.js";
import { protect } from "../middleware/auth.middleware.js";
// import { requireRole } from "../middleware/requireRole.middleware.js";

const router = express.Router();

// ─── Token Helpers ─────────────────────────────────────────────────────────────
const SALT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "7d";
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function serializeUser(user) {
    return {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId || undefined,
    };
}

function signAccessToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

function signRefreshToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
}

function setRefreshCookie(res, token) {
    res.cookie("refreshToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: REFRESH_COOKIE_MAX_AGE,
    });
}

// ─── POST /api/auth/register ───────────────────────────────────────────────────
router.post("/register", async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;
        const normalizedName = String(name || "").trim();
        const normalizedEmail = String(email || "").trim().toLowerCase();

        // Basic field validation
        if (!normalizedName || !normalizedEmail || !password) {
            return res.status(400).json({ message: "Name, email and password are required." });
        }

        if (!EMAIL_REGEX.test(normalizedEmail)) {
            return res.status(400).json({ message: "Please provide a valid email address." });
        }

        if (String(password).length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters long." });
        }

        // Email uniqueness
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
            return res.status(409).json({ message: "Email is already registered." });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Create user
        const user = await User.create({
            name: normalizedName,
            email: normalizedEmail,
            passwordHash,
            role: role === "school-admin" ? "school-admin" : "parent",
        });

        const tokenPayload = { id: user._id, role: user.role };
        const accessToken = signAccessToken(tokenPayload);
        const refreshToken = signRefreshToken(tokenPayload);

        setRefreshCookie(res, refreshToken);

        res.status(201).json({
            accessToken,
            user: serializeUser(user),
        });
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/auth/login ──────────────────────────────────────────────────────
router.post("/login", async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = String(email || "").trim().toLowerCase();

        if (!normalizedEmail || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({ message: "No user found while login." });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        const tokenPayload = { id: user._id, role: user.role };
        const accessToken = signAccessToken(tokenPayload);
        const refreshToken = signRefreshToken(tokenPayload);

        setRefreshCookie(res, refreshToken);

        res.json({
            accessToken,
            user: serializeUser(user),
        });
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post("/logout", (_req, res) => {
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
    });
    res.json({ message: "Logged out successfully." });
});

// ─── GET /api/auth/me (protected) ─────────────────────────────────────────────
router.get("/me", protect, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select("-passwordHash");
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        res.json({ user });
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/auth/admin-info (protected, school-admin only) ─────────────────
router.get("/admin-info", protect, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select("-passwordHash").populate("schoolId");

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        if (user.role !== "school-admin") {
            return res.status(403).json({ message: "Only school admins can access this endpoint." });
        }

        res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                schoolId: user.schoolId?._id,
            },
            school: user.schoolId || null,
        });
    } catch (err) {
        next(err);
    }
});

export default router;
