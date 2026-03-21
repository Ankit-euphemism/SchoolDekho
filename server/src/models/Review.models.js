import mongoose from "mongoose";
import School from "./School.models.js";

const reviewSchema = new mongoose.Schema(
    {
        schoolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "School",
            required: [true, "School reference is required"],
            index: true,
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User reference is required"],
            index: true,
        },

        rating: {
            type: Number,
            required: [true, "Rating is required"],
            min: [1, "Rating must be at least 1"],
            max: [5, "Rating must be at most 5"],
        },

        title: {
            type: String,
            trim: true,
        },

        body: {
            type: String,
            trim: true,
        },

        pros: {
            type: String,
            trim: true,
        },

        cons: {
            type: String,
            trim: true,
        },

        adminResponse: {
            text: {
                type: String,
                trim: true,
            },
            respondedAt: {
                type: Date,
            },
        },
    },
    { timestamps: true }
);

// ─── Compound index: one review per user per school ───────────────────────────
reviewSchema.index({ schoolId: 1, userId: 1 }, { unique: true });

// ─── Helper: recalculate & persist school rating ──────────────────────────────
async function updateSchoolRating(schoolId) {
    const [result] = await mongoose.model("Review").aggregate([
        { $match: { schoolId: new mongoose.Types.ObjectId(schoolId) } }, // convert to the objectid
        {
            $group: {
                _id: "$schoolId", // group by _id
                averageRating: { $avg: "$rating" }, // average rating
                reviewCount: { $sum: 1 }, // adds 1 for every reviews
            },
        },
    ]);

    await School.findByIdAndUpdate(schoolId, {
        averageRating: result ? parseFloat(result.averageRating.toFixed(1)) : 0,
        reviewCount: result ? result.reviewCount : 0,
    });
}

// ─── Post-save hook ───────────────────────────────────────────────────────────
reviewSchema.post("save", async function () {
    await updateSchoolRating(this.schoolId);
});

// ─── Post-delete hooks (keep rating fresh on removal too) ─────────────────────
reviewSchema.post("findOneAndDelete", async function (doc) { // admin delete reviews
    if (doc) await updateSchoolRating(doc.schoolId);
});

reviewSchema.post("deleteOne", { document: true, query: false }, async function () { // users delete reviews
    await updateSchoolRating(this.schoolId);
});

const Review = mongoose.model("Review", reviewSchema);

export default Review;
