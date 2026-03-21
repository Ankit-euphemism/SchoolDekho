import express from "express";
import mongoose from "mongoose";
import Review from "../models/Review.models.js";
import School from "../models/School.models.js";
import { protect } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.middleware.js";
import { reviewWriteLimiter } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

// ─── POST /api/reviews ────────────────────────────────────────────────────────
router.post("/", reviewWriteLimiter, protect, requireRole("parent"), async (req, res, next) => {
    try {
        const { schoolId, rating, title, body, pros, cons } = req.body;

        if (!schoolId || !rating) {
            return res.status(400).json({ message: "schoolId and rating are required." });
        }

        if (!mongoose.Types.ObjectId.isValid(schoolId)) {
            return res.status(400).json({ message: "Invalid schoolId." });
        }

        // Verify school exists
        const school = await School.findById(schoolId);
        if (!school) {
            return res.status(404).json({ message: "School not found." });
        }

        // Compound unique index enforces one review per user per school;
        // a duplicate will throw a MongoServerError with code 11000.
        const review = await Review.create({
            schoolId,
            userId: req.user.id,
            rating,
            title,
            body,
            pros,
            cons,
        });

        // post-save hook in Review model recalculates averageRating & reviewCount

        res.status(201).json(review);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: "You have already reviewed this school." });
        }
        next(err);
    }
});

// ─── GET /api/reviews/school/:schoolId ────────────────────────────────────────
router.get("/school/:schoolId", async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 10,
            sort = "recent",
            minRating,
            maxRating,
            q,
            hasAdminResponse,
        } = req.query;

        if (!mongoose.Types.ObjectId.isValid(req.params.schoolId)) {
            return res.status(400).json({ message: "Invalid schoolId." });
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

        const parsedMinRating = minRating !== undefined ? Number(minRating) : undefined;
        const parsedMaxRating = maxRating !== undefined ? Number(maxRating) : undefined;
        if (parsedMinRating !== undefined && Number.isNaN(parsedMinRating)) {
            return res.status(400).json({ message: "minRating must be a valid number." });
        }
        if (parsedMaxRating !== undefined && Number.isNaN(parsedMaxRating)) {
            return res.status(400).json({ message: "maxRating must be a valid number." });
        }

        const sortOptions = {
            recent: { createdAt: -1 },
            oldest: { createdAt: 1 },
            highest: { rating: -1, createdAt: -1 },
            lowest: { rating: 1, createdAt: -1 },
        };
        const sortOrder = sortOptions[sort] || sortOptions.recent;

        const filter = { schoolId: req.params.schoolId };

        if (parsedMinRating !== undefined || parsedMaxRating !== undefined) {
            filter.rating = {};
            if (parsedMinRating !== undefined) filter.rating.$gte = parsedMinRating;
            if (parsedMaxRating !== undefined) filter.rating.$lte = parsedMaxRating;
        }

        if (q && String(q).trim()) {
            const searchRegex = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            filter.$or = [
                { title: searchRegex },
                { body: searchRegex },
                { pros: searchRegex },
                { cons: searchRegex },
            ];
        }

        if (String(hasAdminResponse).toLowerCase() === "true") {
            filter["adminResponse.text"] = { $exists: true, $ne: "" };
        } else if (String(hasAdminResponse).toLowerCase() === "false") {
            filter.$and = [...(filter.$and || []), {
                $or: [
                    { "adminResponse.text": { $exists: false } },
                    { "adminResponse.text": "" },
                ],
            }];
        }

        const [reviews, total] = await Promise.all([
            Review.find(filter)
                .select("rating title body pros cons adminResponse createdAt userId")
                .sort(sortOrder)
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .populate("userId", "name")
                .lean(),
            Review.countDocuments(filter),
        ]);

        const reviewItems = reviews.map((review) => ({
            id: review._id,
            userName: review.userId?.name || "Unknown",
            rating: review.rating,
            date: review.createdAt,
            title: review.title,
            body: review.body,
            pros: review.pros,
            cons: review.cons,
            adminResponse: review.adminResponse,
        }));

        res.json({
            reviews: reviewItems,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
            total,
            sort: sortOptions[sort] ? sort : "recent",
            filters: {
                minRating: parsedMinRating,
                maxRating: parsedMaxRating,
                q: q || "",
                hasAdminResponse: hasAdminResponse === undefined ? null : String(hasAdminResponse).toLowerCase() === "true",
            },
        });
    } catch (err) {
        next(err);
    }
});

// ─── DELETE /api/reviews/:id ──────────────────────────────────────────────────
router.delete("/:id", reviewWriteLimiter, protect, async (req, res, next) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ message: "Review not found." });
        }

        const isOwner = String(review.userId) === req.user.id;
        const isAdmin = req.user.role === "school-admin";

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "Not authorised to delete this review." });
        }

        // Use findOneAndDelete so the post hook recalculates rating
        await Review.findOneAndDelete({ _id: review._id });

        res.json({ message: "Review deleted." });
    } catch (err) {
        next(err);
    }
});

export default router;
