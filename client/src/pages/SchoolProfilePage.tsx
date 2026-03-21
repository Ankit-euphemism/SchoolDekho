import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useCompare } from "../hooks/useCompare";
import { useAuth } from "../hooks/useAuth";
import { useSeo } from "../hooks/useSeo";
import CompareTray from "../components/CompareTray";
import { SchoolProfileSkeleton } from "../components/SchoolProfileSkeleton";
import {
  createSchoolReview,
  getSchoolById,
  incrementProfileViews,
  getSchoolReviews,
  type SchoolProfileResponse,
  type SchoolReview,
} from "../api/schools";
import { getErrorMessage, parseHttpError } from "../utils/httpError";
import {
  ArrowLeft,
  MapPin,
  Star,
  Phone,
  Mail,
  Globe,
  Calendar,
  GitCompareArrows,
  Check,
  ChevronRight,
  BookOpen,
  Bus,
  Dumbbell,
  Microscope,
  Monitor,
  Music,
  ShieldCheck,
  Trees,
  UtensilsCrossed,
  School,
  AlertCircle,
} from "lucide-react";

const TABS = [
  "Overview",
  "Facilities",
  "Virtual Tour",
  "Location",
  "Reviews",
] as const;

const FACILITY_ICON_MAP: Record<string, typeof BookOpen> = {
  Library: BookOpen,
  "Sports Ground": Dumbbell,
  "Swimming Pool": Dumbbell,
  "Sports Complex": Dumbbell,
  Football: Dumbbell,
  Cricket: Dumbbell,
  Basketball: Dumbbell,
  sports: Dumbbell,
  "Science Lab": Microscope,
  "Computer Lab": Monitor,
  "Math Lab": Microscope,
  Transport: Bus,
  Bus,
  "School Bus": Bus,
  "Music Room": Music,
  "Art Room": Trees,
  Theater: Music,
  "Dance Studio": Music,
  Cafeteria: UtensilsCrossed,
  Auditorium: School,
  Gym: Dumbbell,
  "Health Center": ShieldCheck,
};

type ReviewFormData = {
  rating: number;
  title: string;
  body: string;
  pros: string;
  cons: string;
};

function ReviewForm({
  onSubmit,
  isSubmitting,
  errorMessage,
}: {
  onSubmit: (data: ReviewFormData) => Promise<void>;
  isSubmitting: boolean;
  errorMessage: string | null;
}) {
  const [form, setForm] = useState<ReviewFormData>({
    rating: 0,
    title: "",
    body: "",
    pros: "",
    cons: "",
  });

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.rating || !form.title.trim() || !form.body.trim()) return;
    await onSubmit(form);
    setForm({ rating: 0, title: "", body: "", pros: "", cons: "" });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 rounded-xl border border-slate-700 bg-slate-900/50 p-4 space-y-3"
    >
      <h3 className="text-sm font-semibold text-white">
        Write a Parent Review
      </h3>

      <div>
        <p className="text-xs text-slate-400 mb-1.5">Your Rating</p>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }, (_, index) => {
            const starValue = index + 1;
            return (
              <button
                key={starValue}
                type="button"
                onClick={() =>
                  setForm((prev) => ({ ...prev, rating: starValue }))
                }
                className="p-1"
                aria-label={`Set rating ${starValue}`}
              >
                <Star
                  className={`w-5 h-5 ${starValue <= form.rating ? "fill-amber-400 text-amber-400" : "text-slate-500"}`}
                />
              </button>
            );
          })}
        </div>
      </div>

      <input
        value={form.title}
        onChange={(e) =>
          setForm((prev) => ({ ...prev, title: e.target.value }))
        }
        placeholder="Review title"
        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
      />

      <textarea
        value={form.body}
        onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
        placeholder="Share your experience"
        rows={3}
        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
      />

      <input
        value={form.pros}
        onChange={(e) => setForm((prev) => ({ ...prev, pros: e.target.value }))}
        placeholder="Pros"
        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
      />

      <input
        value={form.cons}
        onChange={(e) => setForm((prev) => ({ ...prev, cons: e.target.value }))}
        placeholder="Cons"
        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
      />

      {errorMessage ? (
        <p className="text-xs text-rose-300">{errorMessage}</p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center rounded-lg bg-sky-500 hover:bg-sky-400 px-3 py-2 text-sm font-medium text-slate-950"
      >
        {isSubmitting ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
}

export default function SchoolProfilePage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Overview");
  const [activePhoto, setActivePhoto] = useState(0);
  const [sortBy, setSortBy] = useState<"recent" | "highest" | "lowest">(
    "recent",
  );
  const [school, setSchool] = useState<SchoolProfileResponse | null>(null);
  const [reviewList, setReviewList] = useState<SchoolReview[]>([]);
  const [isLoadingSchool, setIsLoadingSchool] = useState(true);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [locationArea, setLocationArea] = useState<string | null>(null);
  const [locationAreaLoading, setLocationAreaLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const { compareList, addSchool, removeSchool } = useCompare();
  const { user } = useAuth();
  const schoolId = id ?? "";
  const inCompare = compareList.some((item) => item.id === schoolId);

  // Set SEO tags
  useSeo({
    title: school ? school.name : 'School Profile',
    description: school
      ? `${school.name} - Rating: ${school.averageRating || 'N/A'}/5. ${school.description?.slice(0, 100) || 'Explore detailed information about this school.'}`
      : 'View detailed school information including facilities, reviews, and contact details.',
    image: school?.photos?.[0] || undefined,
    url: window.location.href,
  });

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`w-3.5 h-3.5 ${index < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
      />
    ));

  useEffect(() => {
    if (!schoolId) return;
    const controller = new AbortController();
    setIsLoadingSchool(true);
    setProfileError(null);
    setSchool(null);
    setActivePhoto(0);

    getSchoolById(schoolId, controller.signal)
      .then((data) => setSchool(data))
      .catch(() => setProfileError("Unable to load school profile right now."))
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingSchool(false);
        }
      });

    return () => controller.abort();
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId) return;
    incrementProfileViews(schoolId).catch(() => undefined);
  }, [schoolId]);

  useEffect(() => {
    const coordinates = school?.location?.coordinates;
    if (!coordinates || coordinates.length !== 2) {
      setLocationArea(null);
      return;
    }

    const [lat, lng] = coordinates;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setLocationArea(null);
      return;
    }

    const controller = new AbortController();
    setLocationAreaLoading(true);

    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      },
    )
      .then((res) => {
        if (!res.ok) throw new Error('Failed to reverse geocode location');
        return res.json();
      })
      .then((data) => {
        const address = data?.address || {};
        const primaryArea =
          address.suburb ||
          address.neighbourhood ||
          address.city_district ||
          address.county ||
          null;
        const cityArea =
          address.city ||
          address.town ||
          address.village ||
          address.state_district ||
          address.state ||
          null;

        if (primaryArea && cityArea) {
          setLocationArea(`${primaryArea}, ${cityArea}`);
        } else if (primaryArea || cityArea) {
          setLocationArea(primaryArea || cityArea);
        } else {
          setLocationArea(data?.display_name || null);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLocationArea(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLocationAreaLoading(false);
        }
      });

    return () => controller.abort();
  }, [school?.location?.coordinates]);

  useEffect(() => {
    if (!schoolId) return;
    const controller = new AbortController();
    setIsLoadingReviews(true);
    setReviewError(null);

    getSchoolReviews(schoolId, sortBy, 1, 20, controller.signal)
      .then((data) => {
        setReviewList(data.reviews);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          const errorInfo = parseHttpError(error);
          setReviewError(
            errorInfo.isRateLimited
              ? `${errorInfo.message} Please wait before trying again.`
              : getErrorMessage(error, "Unable to load reviews right now."),
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingReviews(false);
        }
      });

    return () => controller.abort();
  }, [schoolId, sortBy]);

  const schoolPhotos = school?.photos ?? [];
  const mapEmbedUrl = useMemo(() => {
    if (school?.location?.coordinates?.length === 2) {
      const [lat, lng] = school.location.coordinates;
      return `https://www.google.com/maps?q=${lat},${lng}&output=embed`;
    }
    return `https://www.google.com/maps?q=${encodeURIComponent(school?.address || "Lucknow")}&output=embed`;
  }, [school?.address, school?.location?.coordinates]);

  const nearByLandmarks = useMemo(() => {
    const areaText = locationArea || school?.address || 'Local vicinity';
    return [
      `Main School Entrance - ${areaText}`,
      `Nearest Market Area - ${areaText}`,
      `Nearest Public Transport Stop - Around 1-3 km`,
    ];
  }, [locationArea, school?.address]);

  const ratingBreakdown = useMemo(() => {
    return reviewList.reduce(
      (acc, review) => {
        acc[review.rating as 1 | 2 | 3 | 4 | 5] += 1;
        return acc;
      },
      { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    );
  }, [reviewList]);

  const totalRatings = Object.values(ratingBreakdown).reduce(
    (sum, count) => sum + count,
    0,
  );
  const feeRange =
    school?.fees?.min || school?.fees?.max
      ? `Rs ${(school?.fees?.min ?? 0).toLocaleString()} - Rs ${(school?.fees?.max ?? 0).toLocaleString()} per year`
      : "Fee details not available";

  async function onAddReview(data: ReviewFormData) {
    if (!schoolId) return;
    setSubmitError(null);
    setIsSubmittingReview(true);
    try {
      await createSchoolReview({
        schoolId,
        rating: data.rating,
        title: data.title,
        body: data.body,
        pros: data.pros,
        cons: data.cons,
      }, { successMessage: 'Review submitted successfully.' });

      // Refresh reviews from page 1
      const updated = await getSchoolReviews(schoolId, sortBy, 1, 20, undefined, {
        silentToast: true,
      });
      setReviewList(updated.reviews);

      const refreshedSchool = await getSchoolById(schoolId, undefined, {
        silentToast: true,
      });
      setSchool(refreshedSchool);
    } catch (error) {
      const errorInfo = parseHttpError(error);
      setSubmitError(
        errorInfo.isRateLimited
          ? `${errorInfo.message} Please wait before trying again.`
          : getErrorMessage(error, "Unable to submit review. Please make sure you are logged in with a parent account."),
      );
    } finally {
      setIsSubmittingReview(false);
    }
  }

  if (!schoolId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
          Invalid school ID.
        </div>
      </div>
    );
  }

  if (isLoadingSchool && !school) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <SchoolProfileSkeleton />
      </div>
    );
  }

  if (!school) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link
          to="/search"
          className="inline-flex items-center gap-1 text-sm text-slate-300 hover:text-sky-300 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to search
        </Link>
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5 text-sm text-rose-200">
          {profileError || "School not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link
        to="/map"
        className="inline-flex items-center gap-1 text-sm text-slate-300 hover:text-sky-300 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to search
      </Link>

      <div className="rounded-2xl border border-slate-700/70 bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-5 sm:p-6 shadow-[0_16px_50px_rgba(2,6,23,0.35)]">
        <div className="mb-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950">
              {schoolPhotos.length ? (
                <img
                  src={schoolPhotos[activePhoto]}
                  alt={`${school.name} photo ${activePhoto + 1}`}
                  className="h-62.5 w-full object-cover sm:h-82.5"
                />
              ) : (
                <div className="flex h-62.5 items-center justify-center text-sm text-slate-400 sm:h-82.5">
                  No photos available
                </div>
              )}
            </div>
            {schoolPhotos.length > 1 ? (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {schoolPhotos.map((photo, index) => (
                  <button
                    key={photo}
                    type="button"
                    onClick={() => setActivePhoto(index)}
                    className={`shrink-0 overflow-hidden rounded-lg border ${activePhoto === index ? "border-sky-400" : "border-slate-700"}`}
                    aria-label={`Show photo ${index + 1}`}
                  >
                    <img
                      src={photo}
                      alt={`${school.name} thumbnail ${index + 1}`}
                      className="h-14 w-20 object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4 sm:p-5">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">
              {school.name}
            </h1>
            <p className="mt-2 flex items-start gap-2 text-sm text-slate-300">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>{school.address}</span>
            </p>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded border border-slate-700 bg-slate-800/70 px-2.5 py-1 text-slate-200">
                {school.type}
              </span>
              <span className="rounded border border-slate-700 bg-slate-800/70 px-2.5 py-1 text-slate-200">
                {school.board}
              </span>
              <span className="inline-flex items-center gap-1 rounded border border-amber-400/60 bg-amber-500/20 px-2.5 py-1 text-amber-200">
                <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                {school.averageRating?.toFixed(1) ?? "0.0"}
              </span>
            </div>

            <button
              onClick={() =>
                inCompare
                  ? removeSchool(schoolId)
                  : addSchool({ id: schoolId, name: school.name })
              }
              className={`mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                inCompare
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                  : "border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
              }`}
            >
              {inCompare ? (
                <Check className="w-4 h-4" />
              ) : (
                <GitCompareArrows className="w-4 h-4" />
              )}
              {inCompare ? "Added to Compare" : "Add to Compare"}
            </button>
          </div>
        </div>

        <div className="flex gap-1 border-b border-slate-700 mb-6 overflow-x-auto whitespace-nowrap">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-sky-400 text-sky-300"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Overview" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-white mb-2">
                Description
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                {isLoadingSchool
                  ? "Loading school description..."
                  : school.description || "Description not available."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  icon: Calendar,
                  label: "Established",
                  value: school.established,
                },
                {
                  icon: Star,
                  label: "Average Rating",
                  value: `${school.averageRating?.toFixed(0) ?? "0"} / 5`,
                },
                { icon: BookOpen, label: "Board", value: school.board },
                { icon: School, label: "Annual Fees", value: feeRange },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="p-3 border border-slate-700 rounded-lg bg-slate-900/40"
                >
                  <Icon className="w-4 h-4 text-sky-400 mb-1" />
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="text-sm font-medium text-slate-100">{value}</p>
                </div>
              ))}
            </div>

            <div>
              <h2 className="text-sm font-semibold text-white mb-2">Contact</h2>
              <div className="space-y-2 text-sm text-slate-300">
                <p className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />{" "}
                  {school.phone || "Not available"}
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />{" "}
                  {school.email || "Not available"}
                </p>
                <p className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  {school.website ? (
                    <a
                      href={school.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-300 hover:text-sky-200"
                    >
                      Visit Website
                    </a>
                  ) : (
                    <span>Not available</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Facilities" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {(school.facilities || []).map((facility) => {
              const Icon = FACILITY_ICON_MAP[facility] ?? Check;
              return (
                <div
                  key={facility}
                  className="p-3 border border-slate-700 rounded-lg text-sm text-slate-200 bg-slate-900/40"
                >
                  <div className="w-8 h-8 rounded-md bg-slate-800 border border-slate-700 inline-flex items-center justify-center mb-2">
                    <Icon className="w-4 h-4 text-emerald-300" />
                  </div>
                  <p className="text-sm text-slate-100">{facility}</p>
                </div>
              );
            })}
            {(school.facilities || []).length === 0 ? (
              <p className="col-span-full text-sm text-slate-300">Facilities not available.</p>
            ) : null}
          </div>
        )}

        {activeTab === "Virtual Tour" && (
          <div className="rounded-xl border border-slate-700 overflow-hidden bg-slate-900/40">
            {school.virtualTourUrl ? (
              <iframe
                title="School virtual tour"
                src={school.virtualTourUrl}
                className="h-60 w-full sm:h-105"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="p-4 text-sm text-slate-300">
                Virtual tour is not available for this school.
              </div>
            )}
          </div>
        )}

        {activeTab === "Location" && (
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
            <div className="rounded-xl border border-slate-700 overflow-hidden bg-slate-900/40">
              <iframe
                title="School map location"
                src={mapEmbedUrl}
                loading="lazy"
                className="h-70 w-full sm:h-90"
              />
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
              <h3 className="text-sm font-semibold text-white mb-3">
                Area Details
              </h3>
              <p className="text-sm text-slate-300 mb-3">
                {locationAreaLoading
                  ? 'Detecting area from map coordinates...'
                  : `Detected Area: ${locationArea || school.address || 'Unavailable'}`}
              </p>
              <ul className="space-y-2 text-sm text-slate-300">
                {nearByLandmarks.map((landmark) => (
                  <li key={landmark} className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-sky-300 mt-0.5 shrink-0" />
                    <span>{landmark}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === "Reviews" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl font-bold text-white">
                  {school.averageRating?.toFixed(1) ?? "0.0"}
                </span>
                <div>
                  <div className="flex items-center gap-1">
                    {renderStars(school.averageRating ?? 0)}
                  </div>
                  <p className="text-xs text-slate-400">
                    Based on {school.reviewCount ?? reviewList.length} reviews
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count =
                    ratingBreakdown[star as keyof typeof ratingBreakdown];
                  const percentage = totalRatings
                    ? (count / totalRatings) * 100
                    : 0;

                  return (
                    <div
                      key={star}
                      className="grid grid-cols-[28px_1fr_40px] items-center gap-2"
                    >
                      <span className="text-xs text-slate-300">{star}★</span>
                      <progress
                        max={100}
                        value={percentage}
                        className="h-2 w-full overflow-hidden rounded-full appearance-none [&::-webkit-progress-bar]:bg-slate-800 [&::-webkit-progress-value]:bg-amber-400 [&::-moz-progress-bar]:bg-amber-400"
                      />
                      <span className="text-xs text-slate-400 text-right">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {reviewError ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 flex-0 mt-0.5" />
                  <div>
                    <p className="font-medium">{reviewError}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Parent Reviews
              </h3>
              <select
                value={sortBy}
                aria-label="Sort reviews"
                onChange={(e) =>
                  setSortBy(e.target.value as "recent" | "highest" | "lowest")
                }
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
              >
                <option value="recent">Sort: Latest</option>
                <option value="highest">Sort: Highest Rating</option>
                <option value="lowest">Sort: Lowest Rating</option>
              </select>
            </div>

            {isLoadingReviews ? (
              <p className="text-sm text-slate-300">Loading reviews...</p>
            ) : null}

            {reviewList.map((review) => (
              <div
                key={review.id}
                className="border border-slate-700 rounded-lg bg-slate-900/40 overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="text-sm font-medium text-slate-100">
                        {review.userName}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(review.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {renderStars(review.rating)}
                    </div>
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-1">
                    {review.title || "Parent Review"}
                  </h4>
                  <p className="text-sm text-slate-300 mb-2">
                    {review.body || "No review body provided."}
                  </p>
                  <p className="text-xs text-emerald-300">
                    <span className="font-semibold">Pros:</span>{" "}
                    {review.pros || "N/A"}
                  </p>
                  <p className="text-xs text-rose-300 mt-1">
                    <span className="font-semibold">Cons:</span>{" "}
                    {review.cons || "N/A"}
                  </p>
                </div>
                {review.adminResponse?.text && (
                  <div className="border-t border-slate-700 bg-blue-950/30 p-4">
                    <p className="text-xs font-semibold text-blue-300 mb-1.5">
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        School Admin Response
                      </span>
                    </p>
                    <p className="text-sm text-blue-200 mb-1.5">
                      {review.adminResponse.text}
                    </p>
                    <p className="text-xs text-blue-400">
                      {new Date(review.adminResponse.respondedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            ))}

            {user?.role === "parent" ? (
              <ReviewForm
                onSubmit={onAddReview}
                isSubmitting={isSubmittingReview}
                errorMessage={submitError}
              />
            ) : (
              <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-300">
                Please log in as a parent account to add your review.
              </div>
            )}

            <Link
              to="/search"
              className="inline-flex items-center gap-1 text-sm text-sky-300 hover:text-sky-200 mt-2"
            >
              Compare with other schools <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      <CompareTray />
    </div>
  );
}
