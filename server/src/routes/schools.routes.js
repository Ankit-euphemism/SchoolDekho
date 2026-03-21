import express from "express";
import mongoose from "mongoose";
// import { v2 as cloudinary } from "cloudinary";
// import { CloudinaryStorage } from "multer-storage-cloudinary";
import { deleteCloudinaryPhotoByUrl, deleteCloudinaryPhotosByUrls, upload, uploadBufferToCloudinary } from "../utils/cloudinary.js";
import School from "../models/School.models.js";
import Review from "../models/Review.models.js";
import User from "../models/User.models.js";
import { protect } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/requireRole.middleware.js";
import { reviewWriteLimiter, uploadLimiter } from "../middleware/rateLimit.middleware.js";

const router = express.Router();
const SCHOOL_TYPES = ["primary", "secondary", "international"];
const SCHOOL_BOARDS = ["CBSE", "ICSE", "IB", "state"];
const FACILITY_CATEGORIES = {
    Sports: ["Sports Ground", "Swimming Pool", "Sports Complex", "Football", "Cricket", "Basketball", "sports"],
    Academics: ["Science Lab", "Computer Lab", "Library", "Math Lab"],
    "Arts & Culture": ["Music Room", "Art Room", "Theater", "Dance Studio"],
    Amenities: ["Cafeteria", "Auditorium", "Gym", "Health Center"],
    Transport: ["Bus", "Transport", "School Bus"],
};
const ALLOWED_FACILITIES = new Set(Object.values(FACILITY_CATEGORIES).flat());

function parseFacilitiesParam(facilities) {
    if (!facilities) return undefined;
    const parsed = String(facilities)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    return parsed.length ? parsed : undefined;
}

function parseTypeParam(type) {
    if (!type) return undefined;
    const parsed = String(type)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    return parsed.length ? parsed : undefined;
}

function parsePositiveInt(value, fallback, min = 1, max = 100) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
}

function parseSortOrder(sortOrder) {
    return String(sortOrder).toLowerCase() === "asc" ? 1 : -1;
}

function validateFacilities(facilities) {
    if (!Array.isArray(facilities)) return;

    const invalidFacilities = facilities.filter((facility) => !ALLOWED_FACILITIES.has(facility));
    if (invalidFacilities.length > 0) {
        const err = new Error(
            `Invalid facilities: ${invalidFacilities.join(", ")}. Allowed values: ${Array.from(ALLOWED_FACILITIES).join(", ")}.`
        );
        err.status = 400;
        throw err;
    }
}

function escapeRegex(value = "") {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getAdminOwnedSchoolId(userId) {
    const admin = await User.findById(userId).select("schoolId").lean();
    return admin?.schoolId ? String(admin.schoolId) : null;
}

// Parses a value into a finite number or returns NaN if it's not a valid finite number
function parseFiniteNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
}
// Normalizes and validates incoming school data from req.body for create/update operations
function normalizeSchoolPayload(body = {}) {
    const payload = { ...body };

    if (typeof payload.facilities === "string") {
        payload.facilities = parseFacilitiesParam(payload.facilities) || [];
    }

    if (typeof payload.photos === "string") {
        payload.photos = parseFacilitiesParam(payload.photos) || [];
    }

    if (Array.isArray(payload.facilities)) {
        payload.facilities = payload.facilities
            .map((item) => String(item).trim())
            .filter(Boolean);
        validateFacilities(payload.facilities);
    }

    if (payload.fees && typeof payload.fees === "object") {
        const fees = { ...payload.fees };
        if (fees.min !== undefined) fees.min = parseFiniteNumber(fees.min);
        if (fees.max !== undefined) fees.max = parseFiniteNumber(fees.max);
        payload.fees = fees;
    }

    const lat = payload.lat ?? payload.latitude;
    const lng = payload.lng ?? payload.longitude;
    delete payload.lat;
    delete payload.lng;
    delete payload.latitude;
    delete payload.longitude;

    if (lat !== undefined || lng !== undefined) {
        const parsedLat = parseFiniteNumber(lat);
        const parsedLng = parseFiniteNumber(lng);

        if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
            const err = new Error("lat/lng must be valid numbers.");
            err.status = 400;
            throw err;
        }

        if (parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
            const err = new Error("lat must be between -90..90 and lng between -180..180.");
            err.status = 400;
            throw err;
        }

        payload.location = {
            type: "Point",
            coordinates: [parsedLat, parsedLng],
        };
    }

    if (payload.location && Array.isArray(payload.location.coordinates)) {
        const [latValue, lngValue] = payload.location.coordinates;
        const parsedLat = parseFiniteNumber(latValue);
        const parsedLng = parseFiniteNumber(lngValue);

        if (Number.isNaN(parsedLng) || Number.isNaN(parsedLat)) {
            const err = new Error("location.coordinates must contain valid numbers [lng, lat].");
            err.status = 400;
            throw err;
        }

        payload.location = {
            type: "Point",
            coordinates: [parsedLat, parsedLng],
        };
    }

    return payload;
}

// ─── GET /api/schools/nearby ──────────────────────────────────────────────────
router.get("/nearby", async (req, res, next) => {
    try {
        const { lat, lng, radius, type, board, minRating, facilities, sortBy, sortOrder, page, limit, includeMeta } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ message: "lat and lng query params are required." });
        }

        const latitude = parseFiniteNumber(lat);
        const longitude = parseFiniteNumber(lng);
        const radiusKm = radius !== undefined ? parseFiniteNumber(radius) : 10;
        const maxDistMeters = radiusKm * 1000;
        const parsedMinRating = minRating !== undefined ? parseFiniteNumber(minRating) : undefined;
        const parsedFacilities = parseFacilitiesParam(facilities);
        const parsedTypes = parseTypeParam(type);
        const parsedPage = parsePositiveInt(page, 1, 1, 10_000);
        const parsedLimit = parsePositiveInt(limit, 20, 1, 100);
        const includePagination = page !== undefined || limit !== undefined;
        const requestedSortBy = String(sortBy || "distance").toLowerCase();
        const order = parseSortOrder(sortOrder);

        if (Number.isNaN(latitude) || Number.isNaN(longitude) || Number.isNaN(maxDistMeters)) {
            return res.status(400).json({ message: "lat, lng and radius must be valid numbers." });
        }

        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            return res.status(400).json({ message: "lat must be between -90..90 and lng between -180..180." });
        }

        if (radiusKm <= 0) {
            return res.status(400).json({ message: "radius must be greater than 0." });
        }

        if (parsedMinRating !== undefined && Number.isNaN(parsedMinRating)) {
            return res.status(400).json({ message: "minRating must be a valid number." });
        }

        if (parsedMinRating !== undefined && (parsedMinRating < 0 || parsedMinRating > 5)) {
            return res.status(400).json({ message: "minRating must be between 0 and 5." });
        }

        if (parsedTypes && parsedTypes.some((schoolType) => !SCHOOL_TYPES.includes(schoolType))) {
            return res.status(400).json({ message: `type must be one of: ${SCHOOL_TYPES.join(", ")}.` });
        }

        if (board && !SCHOOL_BOARDS.includes(board)) {
            return res.status(400).json({ message: `board must be one of: ${SCHOOL_BOARDS.join(", ")}.` });
        }

        if (parsedFacilities && parsedFacilities.some((facility) => !ALLOWED_FACILITIES.has(facility))) {
            return res.status(400).json({ message: "facilities contains invalid value(s)." });
        }

        // Base geospatial query
        const filter = {
            location: {
                $nearSphere: {
                    $geometry: { type: "Point", coordinates: [latitude, longitude] },
                    $maxDistance: maxDistMeters,
                },
            },
        };

        // Dynamic filters
        if (parsedTypes?.length === 1) {
            filter.type = parsedTypes[0];
        } else if (parsedTypes?.length) {
            filter.type = { $in: parsedTypes };
        }
        if (board) filter.board = board;
        if (parsedMinRating !== undefined) filter.averageRating = { $gte: parsedMinRating };
        if (parsedFacilities) {
            filter.facilities = { $all: parsedFacilities };
        }

        const schools = await School.find(filter).lean();

        // Compute distance for each result (Haversine)
        const toRad = (deg) => (deg * Math.PI) / 180;
        const R = 6_371_000; // Earth radius in meters

        const results = schools.map((school) => {
            const [sLat, sLng] = school.location?.coordinates || [latitude, longitude];
            const dLat = toRad(sLat - latitude);
            const dLng = toRad(sLng - longitude);
            const a =
                Math.sin(dLat / 2) ** 2 +
                Math.cos(toRad(latitude)) * Math.cos(toRad(sLat)) * Math.sin(dLng / 2) ** 2;
            const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            return { ...school, distance: Math.round(distance) }; // meters
        });

        const sortableFields = new Set(["distance", "name", "averagerating", "reviewcount"]);
        const safeSortBy = sortableFields.has(requestedSortBy) ? requestedSortBy : "distance";

        const sortedResults = [...results].sort((a, b) => {
            if (safeSortBy === "name") {
                return String(a.name).localeCompare(String(b.name)) * order;
            }

            const aValue = Number(a[safeSortBy === "averagerating" ? "averageRating" : safeSortBy === "reviewcount" ? "reviewCount" : "distance"] || 0);
            const bValue = Number(b[safeSortBy === "averagerating" ? "averageRating" : safeSortBy === "reviewcount" ? "reviewCount" : "distance"] || 0);
            return (aValue - bValue) * order;
        });

        const total = sortedResults.length;
        const paginatedResults = includePagination
            ? sortedResults.slice((parsedPage - 1) * parsedLimit, (parsedPage - 1) * parsedLimit + parsedLimit)
            : sortedResults;

        if (String(includeMeta).toLowerCase() === "true") {
            return res.json({
                schools: paginatedResults,
                pagination: {
                    page: parsedPage,
                    limit: parsedLimit,
                    total,
                    totalPages: includePagination ? Math.ceil(total / parsedLimit) : 1,
                },
                sort: {
                    sortBy: safeSortBy,
                    sortOrder: order === 1 ? "asc" : "desc",
                },
            });
        }

        res.json(paginatedResults);
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/schools ─────────────────────────────────────────────────────────
router.get("/", async (req, res, next) => {
    try {
        const {
            q,
            type,
            board,
            facilities,
            minRating,
            maxRating,
            sortBy,
            sortOrder,
            page,
            limit,
            includeMeta,
        } = req.query;

        const parsedPage = parsePositiveInt(page, 1, 1, 10_000);
        const parsedLimit = parsePositiveInt(limit, 20, 1, 100);
        const shouldPaginate = page !== undefined || limit !== undefined || String(includeMeta).toLowerCase() === "true";
        const parsedTypes = parseTypeParam(type);
        const parsedFacilities = parseFacilitiesParam(facilities);
        const parsedMinRating = minRating !== undefined ? parseFiniteNumber(minRating) : undefined;
        const parsedMaxRating = maxRating !== undefined ? parseFiniteNumber(maxRating) : undefined;
        const order = parseSortOrder(sortOrder);

        if (board && !SCHOOL_BOARDS.includes(String(board))) {
            return res.status(400).json({ message: `board must be one of: ${SCHOOL_BOARDS.join(", ")}.` });
        }

        if (parsedTypes && parsedTypes.some((schoolType) => !SCHOOL_TYPES.includes(schoolType))) {
            return res.status(400).json({ message: `type must be one of: ${SCHOOL_TYPES.join(", ")}.` });
        }

        if (parsedMinRating !== undefined && Number.isNaN(parsedMinRating)) {
            return res.status(400).json({ message: "minRating must be a valid number." });
        }

        if (parsedMaxRating !== undefined && Number.isNaN(parsedMaxRating)) {
            return res.status(400).json({ message: "maxRating must be a valid number." });
        }

        if (parsedFacilities && parsedFacilities.some((facility) => !ALLOWED_FACILITIES.has(facility))) {
            return res.status(400).json({ message: "facilities contains invalid value(s)." });
        }

        const filter = {};

        if (q) {
            const qRegex = new RegExp(escapeRegex(String(q).trim()), "i");
            filter.$or = [{ name: qRegex }, { address: qRegex }, { description: qRegex }];
        }

        if (parsedTypes?.length === 1) {
            filter.type = parsedTypes[0];
        } else if (parsedTypes?.length) {
            filter.type = { $in: parsedTypes };
        }

        if (board) {
            filter.board = board;
        }

        if (parsedFacilities?.length) {
            filter.facilities = { $all: parsedFacilities };
        }

        if (parsedMinRating !== undefined || parsedMaxRating !== undefined) {
            filter.averageRating = {};
            if (parsedMinRating !== undefined) filter.averageRating.$gte = parsedMinRating;
            if (parsedMaxRating !== undefined) filter.averageRating.$lte = parsedMaxRating;
        }

        const sortMapping = {
            name: "name",
            rating: "averageRating",
            reviews: "reviewCount",
            createdat: "createdAt",
        };
        const requestedSortBy = String(sortBy || "name").toLowerCase();
        const safeSortBy = sortMapping[requestedSortBy] || "name";

        let schoolsQuery = School.find(filter)
            .select("name type board address location averageRating reviewCount facilities photos")
            .sort({ [safeSortBy]: order });

        if (shouldPaginate) {
            schoolsQuery = schoolsQuery
                .skip((parsedPage - 1) * parsedLimit)
                .limit(parsedLimit);
        }

        const schools = await schoolsQuery.lean();
        const total = shouldPaginate ? await School.countDocuments(filter) : schools.length;

        if (String(includeMeta).toLowerCase() === "true") {
            return res.json({
                schools,
                pagination: {
                    page: parsedPage,
                    limit: parsedLimit,
                    total,
                    totalPages: Math.ceil(total / parsedLimit),
                },
                sort: {
                    sortBy: requestedSortBy,
                    sortOrder: order === 1 ? "asc" : "desc",
                },
                filters: {
                    q: q || "",
                    type: parsedTypes || [],
                    board: board || null,
                    facilities: parsedFacilities || [],
                    minRating: parsedMinRating,
                    maxRating: parsedMaxRating,
                },
            });
        }

        res.json(schools);
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/schools/:id ─────────────────────────────────────────────────────
router.get("/:id", async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid school id." });
        }

        const [school, reviews] = await Promise.all([
            School.findById(req.params.id).lean(),
            Review.find({ schoolId: req.params.id })
                .sort({ createdAt: -1 })
                .limit(5)
                .populate("userId", "name")
                .lean(),
        ]);

        if (!school) {
            return res.status(404).json({ message: "School not found." });
        }

        res.json({ ...school, reviews });
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/schools ───────────────────────────────────────────────────────
router.post("/", reviewWriteLimiter, protect, requireRole("school-admin"), async (req, res, next) => {
    try {
        const payload = normalizeSchoolPayload(req.body);
        const school = await School.create(payload);

        // Link the creating admin to this school
        await User.findByIdAndUpdate(req.user.id, { schoolId: school._id });

        res.status(201).json(school);
    } catch (err) {
        next(err);
    }
});

// ─── PUT /api/schools/:id ─────────────────────────────────────────────────────
router.put("/:id", reviewWriteLimiter, protect, requireRole("school-admin"), async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid school id." });
        }

        const ownedSchoolId = await getAdminOwnedSchoolId(req.user.id);
        if (!ownedSchoolId || ownedSchoolId !== req.params.id) {
            return res.status(403).json({ message: "You can only update your own school." });
        }

        const payload = normalizeSchoolPayload(req.body);
        let removedPhotoUrls = [];

        if (Object.prototype.hasOwnProperty.call(payload, "photos") && Array.isArray(payload.photos)) {
            const existingSchool = await School.findById(req.params.id).select("photos").lean();

            if (!existingSchool) {
                return res.status(404).json({ message: "School not found." });
            }

            const nextPhotosSet = new Set(payload.photos);
            removedPhotoUrls = (existingSchool.photos || []).filter((url) => !nextPhotosSet.has(url));
        }

        const school = await School.findByIdAndUpdate(req.params.id, payload, {
            new: true,
            runValidators: true,
        });

        if (!school) {
            return res.status(404).json({ message: "School not found." });
        }

        if (removedPhotoUrls.length) {
            const deletionResults = await deleteCloudinaryPhotosByUrls(removedPhotoUrls);
            const failedDeletions = deletionResults.filter((result) => result.status === "rejected");

            if (failedDeletions.length) {
                console.error("Some Cloudinary photo deletions failed after school update.", {
                    schoolId: req.params.id,
                    failedCount: failedDeletions.length,
                });
            }
        }

        res.json(school);
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/schools/:id/upload ─────────────────────────────────────────────
router.post(
    "/:id/upload",
    uploadLimiter,
    protect,
    requireRole("school-admin"),
    upload.single("photo"),
    async (req, res, next) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(400).json({ message: "Invalid school id." });
            }

            const ownedSchoolId = await getAdminOwnedSchoolId(req.user.id);
            if (!ownedSchoolId || ownedSchoolId !== req.params.id) {
                return res.status(403).json({ message: "You can only upload to your own school." });
            }

            if (!req.file) {
                return res.status(400).json({ message: "No file uploaded." });
            }

            const uploadResult = await uploadBufferToCloudinary(req.file.buffer, req.file.mimetype);
            const photoUrl = uploadResult?.secure_url || uploadResult?.url;
            if (!photoUrl) {
                return res.status(500).json({ message: "Upload succeeded but no URL was returned." });
            }

            const school = await School.findByIdAndUpdate(
                req.params.id,
                { $push: { photos: photoUrl } },
                { new: true }
            );

            if (!school) {
                return res.status(404).json({ message: "School not found." });
            }

            res.json({ photoUrl, photos: school.photos });
        } catch (err) {
            next(err);
        }
    }
);

// ─── GET /api/schools/:id/reviews (Admin only) ────────────────────────────────
router.get("/:id/reviews", protect, requireRole("school-admin"), async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid school id." });
        }

        const pageNum = parsePositiveInt(req.query.page, 1, 1, 10_000);
        const limitNum = parsePositiveInt(req.query.limit, 8, 1, 100);
        const minRating = req.query.minRating !== undefined ? parseFiniteNumber(req.query.minRating) : undefined;
        const maxRating = req.query.maxRating !== undefined ? parseFiniteNumber(req.query.maxRating) : undefined;
        const hasResponse = req.query.hasResponse;
        const sortBy = String(req.query.sortBy || "createdAt").toLowerCase();
        const order = parseSortOrder(req.query.sortOrder);

        const ownedSchoolId = await getAdminOwnedSchoolId(req.user.id);
        if (!ownedSchoolId || ownedSchoolId !== req.params.id) {
            return res.status(403).json({ message: "You can only view reviews for your own school." });
        }

        if (minRating !== undefined && Number.isNaN(minRating)) {
            return res.status(400).json({ message: "minRating must be a valid number." });
        }

        if (maxRating !== undefined && Number.isNaN(maxRating)) {
            return res.status(400).json({ message: "maxRating must be a valid number." });
        }

        const filter = { schoolId: req.params.id };
        if (minRating !== undefined || maxRating !== undefined) {
            filter.rating = {};
            if (minRating !== undefined) filter.rating.$gte = minRating;
            if (maxRating !== undefined) filter.rating.$lte = maxRating;
        }

        if (String(hasResponse).toLowerCase() === "true") {
            filter["adminResponse.text"] = { $exists: true, $ne: "" };
        } else if (String(hasResponse).toLowerCase() === "false") {
            filter.$or = [
                { "adminResponse.text": { $exists: false } },
                { "adminResponse.text": "" },
            ];
        }

        const sortMapping = {
            createdat: "createdAt",
            rating: "rating",
            respondedat: "adminResponse.respondedAt",
        };
        const safeSortBy = sortMapping[sortBy] || "createdAt";

        const [reviews, total] = await Promise.all([
            Review.find(filter)
                .sort({ [safeSortBy]: order })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .populate("userId", "name email createdAt")
                .lean(),
            Review.countDocuments(filter),
        ]);

        res.json({
            reviews,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
            total,
            sort: {
                sortBy: safeSortBy,
                sortOrder: order === 1 ? "asc" : "desc",
            },
        });
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/schools/:id/reviews/:reviewId/respond (Admin only) ──────────────
router.post(
    "/:id/reviews/:reviewId/respond",
    reviewWriteLimiter,
    protect,
    requireRole("school-admin"),
    async (req, res, next) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.reviewId)) {
                return res.status(400).json({ message: "Invalid school or review id." });
            }

            const ownedSchoolId = await getAdminOwnedSchoolId(req.user.id);
            if (!ownedSchoolId || ownedSchoolId !== req.params.id) {
                return res.status(403).json({ message: "You can only respond to reviews for your own school." });
            }

            const { text } = req.body;
            if (!text || !text.trim()) {
                return res.status(400).json({ message: "Response text is required." });
            }

            const review = await Review.findByIdAndUpdate(
                req.params.reviewId,
                {
                    adminResponse: {
                        text: text.trim(),
                        respondedAt: new Date(),
                    },
                },
                { new: true }
            );

            if (!review) {
                return res.status(404).json({ message: "Review not found." });
            }

            res.json(review);
        } catch (err) {
            next(err);
        }
    }
);

// ─── DELETE /api/schools/:id/photos/:photoUrl (Admin only) ────────────────────
router.delete("/:id/photos/:photoUrl", reviewWriteLimiter, protect, requireRole("school-admin"), async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid school id." });
        }

        const ownedSchoolId = await getAdminOwnedSchoolId(req.user.id);
        if (!ownedSchoolId || ownedSchoolId !== req.params.id) {
            return res.status(403).json({ message: "You can only delete photos from your own school." });
        }

        // URL encoded photo URL needs to be decoded
        const photoUrl = decodeURIComponent(req.params.photoUrl);

        const school = await School.findByIdAndUpdate(
            req.params.id,
            { $pull: { photos: photoUrl } },
            { new: true }
        );

        if (!school) {
            return res.status(404).json({ message: "School not found." });
        }

        let cloudinaryDeletion = null;
        try {
            cloudinaryDeletion = await deleteCloudinaryPhotoByUrl(photoUrl);
        } catch (deleteErr) {
            console.error("Cloudinary photo deletion failed.", {
                schoolId: req.params.id,
                photoUrl,
                error: deleteErr.message,
            });
            cloudinaryDeletion = { status: "error", message: "Cloudinary deletion failed." };
        }

        res.json({ message: "Photo deleted.", photos: school.photos, cloudinaryDeletion });
    } catch (err) {
        next(err);
    }
});

// ─── POST /api/schools/:id/view-increment ────────────────────────────────────
router.post("/:id/view-increment", reviewWriteLimiter, async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid school id." });
        }

        const school = await School.findByIdAndUpdate(
            req.params.id,
            { $inc: { profileViews: 1 } },
            { new: true }
        );

        if (!school) {
            return res.status(404).json({ message: "School not found." });
        }

        res.json({ profileViews: school.profileViews });
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/schools/:id/analytics (Admin only) ────────────────────────────────
router.get("/:id/analytics", protect, requireRole("school-admin"), async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid school id." });
        }

        const ownedSchoolId = await getAdminOwnedSchoolId(req.user.id);
        if (!ownedSchoolId || ownedSchoolId !== req.params.id) {
            return res.status(403).json({ message: "You can only view analytics for your own school." });
        }

        const school = await School.findById(req.params.id).select("averageRating reviewCount profileViews").lean();

        if (!school) {
            return res.status(404).json({ message: "School not found." });
        }

        // Get reviews by month
        const reviewsByMonth = await Review.aggregate([
            { $match: { schoolId: new mongoose.Types.ObjectId(req.params.id) } },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                    },
                    count: { $sum: 1 },
                    avgRating: { $avg: "$rating" },
                },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
        ]);

        // Format for chart
        const chartData = reviewsByMonth.map(({ _id, count, avgRating }) => ({
            month: `${_id.year}-${String(_id.month).padStart(2, "0")}`,
            reviews: count,
            rating: parseFloat(avgRating.toFixed(1)),
        }));

        res.json({
            totalProfileViews: school.profileViews || 0,
            averageRating: school.averageRating || 0,
            totalReviews: school.reviewCount || 0,
            reviewsByMonth: chartData,
        });
    } catch (err) {
        next(err);
    }
});

export default router;
