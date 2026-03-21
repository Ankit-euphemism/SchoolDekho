import { useEffect, useState, useCallback, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSeo } from '../hooks/useSeo';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { getAdminInfo } from '../api/auth';
import {
  createSchool,
  getSchoolById,
  updateSchool,
  uploadSchoolPhoto,
  deleteSchoolPhoto,
  getAdminReviews,
  addAdminResponse,
  getSchoolAnalytics,
  type SchoolProfileResponse,
  type AdminReview,
  type AdminReviewsResponse,
  type AnalyticsData,
} from '../api/schools';
import { getErrorMessage, parseHttpError } from '../utils/httpError';
import { useDropzone } from 'react-dropzone';
import { GoogleMap, MarkerF, useLoadScript } from '@react-google-maps/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  Upload,
  Trash2,
  Send,
  TrendingUp,
  MessageSquare,
  Eye,
  Star,
  AlertCircle,
  Loader,
  X,
} from 'lucide-react';
import { FACILITY_CATEGORIES, FACILITY_OPTIONS } from '../constants/facilities';

type TabType = 'profile' | 'photos' | 'reviews' | 'analytics';
const NEW_SCHOOL_DEFAULT_LOCATION = { lat: 26.8393, lng: 80.9231 };

interface FormData extends Omit<Partial<SchoolProfileResponse>, 'facilities'> {
  facilities?: string[];
}
const ALLOWED_FACILITIES = Array.from(new Set(FACILITY_OPTIONS));
const ALLOWED_FACILITIES_SET = new Set(ALLOWED_FACILITIES);

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 font-medium transition border-b-2 ${
        active
          ? 'border-blue-400 text-blue-400'
          : 'border-transparent text-slate-400 hover:text-slate-300'
      }`}
    >
      {label}
    </button>
  );
}

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">{title}</p>
          <div className="text-3xl font-bold text-slate-100">{value}</div>
        </div>
        {icon}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  useSeo({
    title: 'Admin Dashboard',
    description: 'Manage your school profile, respond to reviews, view analytics, and upload school photos on SchoolDekho.',
  });
  const { user } = useAuth();
  const navigate = useNavigate();
  const { schoolId } = useParams<{ schoolId: string }>();

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [school, setSchool] = useState<SchoolProfileResponse | null>(null);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [reviewMeta, setReviewMeta] = useState<Pick<AdminReviewsResponse, 'page' | 'totalPages' | 'total'>>({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [formData, setFormData] = useState<FormData>({});
  const [respondingToReview, setRespondingToReview] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<Record<string, string>>({});
  const [submittingResponse, setSubmittingResponse] = useState<Record<string, boolean>>({});
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [creatingSchool, setCreatingSchool] = useState(false);
  const [newSchoolData, setNewSchoolData] = useState({
    name: '',
    type: 'primary' as 'primary' | 'secondary' | 'international',
    board: 'CBSE' as 'CBSE' | 'ICSE' | 'IB' | 'state',
    address: '',
    lat: '',
    lng: '',
    description: '',
    facilities: [] as string[],
  });

  const { isLoaded: isMapLoaded, loadError: mapLoadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY ?? '',
  });

  const managedSchoolId = schoolId || school?._id;
  const adminDisplayName = user?.name || 'School Admin';
  const totalPhotos = school?.photos?.length || 0;
  const hasVirtualTour = Boolean(school?.virtualTourUrl);

  const showToast = (type: ToastState['type'], message: string) => {
    setToast({ type, message });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Load school data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Fetch admin info and school data from auth endpoint
        const adminData = await getAdminInfo();

        let targetSchool: SchoolProfileResponse | null = adminData.school ?? null;

        // If a schoolId is provided in URL, allow opening that dashboard view for school-admin users.
        if (schoolId) {
          targetSchool = await getSchoolById(schoolId);
        }

        setSchool(targetSchool);
        if (targetSchool) {
          setError(null);
          setFormData({
            ...targetSchool,
            facilities: targetSchool.facilities || [],
          });
        } else {
          setFormData({});
          setError(null);
        }
      } catch (err) {
        const errorInfo = parseHttpError(err);
        setError(
          errorInfo.isRateLimited
            ? `${errorInfo.message} Please wait before trying again.`
            : getErrorMessage(err, 'Failed to load school data'),
        );
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [schoolId]);

  // Load reviews when tab/page changes
  useEffect(() => {
    async function loadReviews() {
      if (activeTab !== 'reviews' || !managedSchoolId) return;
      try {
        setReviewsLoading(true);
        const data = await getAdminReviews(managedSchoolId, reviewPage, 8);
        setReviews(data.reviews);
        setReviewMeta({
          page: data.page,
          totalPages: data.totalPages,
          total: data.total,
        });
      } catch (err) {
        const errorInfo = parseHttpError(err);
        setError(
          errorInfo.isRateLimited
            ? `${errorInfo.message} Please wait before trying again.`
            : getErrorMessage(err, 'Failed to load reviews'),
        );
      } finally {
        setReviewsLoading(false);
      }
    }
    loadReviews();
  }, [activeTab, managedSchoolId, reviewPage]);

  useEffect(() => {
    if (activeTab === 'reviews') {
      setReviewPage(1);
    }
  }, [activeTab, managedSchoolId]);

  // Load analytics when tab changes
  useEffect(() => {
    async function loadAnalytics() {
      if (activeTab !== 'analytics' || !managedSchoolId) return;
      try {
        setAnalyticsLoading(true);
        const data = await getSchoolAnalytics(managedSchoolId);
        setAnalytics(data);
      } catch (err) {
        const errorInfo = parseHttpError(err);
        setError(
          errorInfo.isRateLimited
            ? `${errorInfo.message} Please wait before trying again.`
            : getErrorMessage(err, 'Failed to load analytics'),
        );
      } finally {
        setAnalyticsLoading(false);
      }
    }
    loadAnalytics();
  }, [activeTab, managedSchoolId]);

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!managedSchoolId) return;

    try {
      setSavingProfile(true);
      const selectedFacilities = formData.facilities || [];
      const invalidFacilities = selectedFacilities.filter((facility) => !ALLOWED_FACILITIES_SET.has(facility));
      if (invalidFacilities.length > 0) {
        setSavingProfile(false);
        setError(`Invalid facilities selected: ${invalidFacilities.join(', ')}`);
        showToast('error', 'Invalid facilities selected.');
        return;
      }

      const dataToSend = {
        ...formData,
        facilities: selectedFacilities,
      };
      const updated = await updateSchool(managedSchoolId, dataToSend);
      setSchool(updated);
      setError(null);
      showToast('success', 'School profile updated successfully.');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update school profile'));
      showToast('error', 'Failed to update school profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleProfileFacility = (facility: string) => {
    setFormData((prev) => {
      const currentFacilities = prev.facilities || [];
      const hasFacility = currentFacilities.includes(facility);

      return {
        ...prev,
        facilities: hasFacility
          ? currentFacilities.filter((item) => item !== facility)
          : [...currentFacilities, facility],
      };
    });
  };

  const toggleNewSchoolFacility = (facility: string) => {
    setNewSchoolData((prev) => {
      const hasFacility = prev.facilities.includes(facility);
      return {
        ...prev,
        facilities: hasFacility
          ? prev.facilities.filter((item) => item !== facility)
          : [...prev.facilities, facility],
      };
    });
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!managedSchoolId) return;

      try {
        setUploadingPhotos(true);
        setError(null);

        for (const file of acceptedFiles) {
          await uploadSchoolPhoto(managedSchoolId, file);
        }

        // Reload school data to get updated photos
        const updated = await getSchoolById(managedSchoolId);
        setSchool(updated);
        showToast('success', `${acceptedFiles.length} photo(s) uploaded successfully.`);
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to upload photos'));
        showToast('error', 'Failed to upload photos.');
      } finally {
        setUploadingPhotos(false);
      }
    },
    [managedSchoolId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    },
  });

  const handleDeletePhoto = async (photoUrl: string) => {
    if (!managedSchoolId) return;

    if (!window.confirm('Delete this photo permanently?')) {
      return;
    }

    try {
      await deleteSchoolPhoto(managedSchoolId, photoUrl);
      // Reload school data
      const updated = await getSchoolById(managedSchoolId);
      setSchool(updated);
      showToast('success', 'Photo deleted successfully.');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete photo'));
      showToast('error', 'Failed to delete photo.');
    }
  };

  const handleSubmitResponse = async (reviewId: string) => {
    if (!managedSchoolId || !responseText[reviewId]?.trim()) return;

    try {
      setSubmittingResponse(prev => ({ ...prev, [reviewId]: true }));
      await addAdminResponse(managedSchoolId, reviewId, responseText[reviewId]);
      // Reload reviews
      const updated = await getAdminReviews(managedSchoolId, reviewPage, 8);
      setReviews(updated.reviews);
      setReviewMeta({
        page: updated.page,
        totalPages: updated.totalPages,
        total: updated.total,
      });
      setResponseText(prev => ({ ...prev, [reviewId]: '' }));
      setRespondingToReview(null);
      showToast('success', 'Response posted publicly.');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to submit response'));
      showToast('error', 'Failed to submit response.');
    } finally {
      setSubmittingResponse(prev => ({ ...prev, [reviewId]: false }));
    }
  };

  const handleCreateSchool = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const latitude = Number(newSchoolData.lat);
    const longitude = Number(newSchoolData.lng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setError('Please select school location on the map.');
      return;
    }

    try {
      setCreatingSchool(true);
      const createdSchool = await createSchool({
        name: newSchoolData.name.trim(),
        type: newSchoolData.type,
        board: newSchoolData.board,
        address: newSchoolData.address.trim(),
        lat: latitude,
        lng: longitude,
        description: newSchoolData.description.trim() || undefined,
        facilities: newSchoolData.facilities,
      });

      navigate(`/admin/dashboard/${createdSchool._id}`);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create school.'));
    } finally {
      setCreatingSchool(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-slate-200 flex items-center gap-2">
          <Loader className="animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  // Redirect if not school-admin
  if (!user || user.role !== 'school-admin') {
    return <Navigate to="/login" replace />;
  }

  if (!school) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100 px-4 py-6 md:px-8 md:py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800/60 p-5">
            <h2 className="text-xl font-semibold text-white">Create Your School Profile</h2>
            <p className="mt-2 text-sm text-slate-300">
              You are logged in as a school admin but no school is linked yet. Create one below and you will be redirected to your admin dashboard.
            </p>
          </div>

          {error ? (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-gap-2">
              <AlertCircle className="text-red-400 shrink-0" size={20} />
              <p className="text-red-400 ml-2">{error}</p>
            </div>
          ) : null}

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 md:p-8">
            <form onSubmit={handleCreateSchool} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">School Name</label>
                <input
                  type="text"
                  value={newSchoolData.name}
                  onChange={(e) => setNewSchoolData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-400"
                  placeholder="e.g., Central High School"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Type</label>
                  <select
                    title="School type"
                    aria-label="School type"
                    value={newSchoolData.type}
                    onChange={(e) => setNewSchoolData((prev) => ({ ...prev, type: e.target.value as 'primary' | 'secondary' | 'international' }))}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-400"
                  >
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                    <option value="international">International</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Board</label>
                  <select
                    title="School board"
                    aria-label="School board"
                    value={newSchoolData.board}
                    onChange={(e) => setNewSchoolData((prev) => ({ ...prev, board: e.target.value as 'CBSE' | 'ICSE' | 'IB' | 'state' }))}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-400"
                  >
                    <option value="CBSE">CBSE</option>
                    <option value="ICSE">ICSE</option>
                    <option value="IB">IB</option>
                    <option value="state">State</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Address</label>
                <textarea
                  value={newSchoolData.address}
                  onChange={(e) => setNewSchoolData((prev) => ({ ...prev, address: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-400"
                  placeholder="123 Main Street, City, State"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Pick Location on Map</label>
                <p className="text-xs text-slate-400 mb-3">Click anywhere on the map to pin your school location.</p>

                <div className="rounded-lg border border-slate-600 overflow-hidden h-72 bg-slate-700/40">
                  {mapLoadError ? (
                    <div className="h-full flex items-center justify-center text-sm text-rose-300 px-4 text-center">
                      Unable to load map. Please check Google Maps API key.
                    </div>
                  ) : !isMapLoaded ? (
                    <div className="h-full flex items-center justify-center text-sm text-slate-300">Loading map...</div>
                  ) : (
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '100%' }}
                      center={
                        Number.isFinite(Number(newSchoolData.lat)) && Number.isFinite(Number(newSchoolData.lng))
                          ? { lat: Number(newSchoolData.lat), lng: Number(newSchoolData.lng) }
                          : NEW_SCHOOL_DEFAULT_LOCATION
                      }
                      zoom={2}
                      onClick={(event) => {
                        const lat = event.latLng?.lat();
                        const lng = event.latLng?.lng();
                        if (lat == null || lng == null) return;

                        setNewSchoolData((prev) => ({
                          ...prev,
                          lat: lat.toFixed(6),
                          lng: lng.toFixed(6),
                        }));
                      }}
                      options={{ streetViewControl: false, mapTypeControl: false }}
                    >
                      {Number.isFinite(Number(newSchoolData.lat)) && Number.isFinite(Number(newSchoolData.lng)) && (
                        <MarkerF
                          position={{ lat: Number(newSchoolData.lat), lng: Number(newSchoolData.lng) }}
                        />
                      )}
                    </GoogleMap>
                  )}
                </div>

                <p className="mt-3 text-xs text-slate-300">
                  Selected Coordinates: {newSchoolData.lat || '—'}, {newSchoolData.lng || '—'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description (optional)</label>
                <textarea
                  value={newSchoolData.description}
                  onChange={(e) => setNewSchoolData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-400"
                  placeholder="Briefly describe your school..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Facilities</label>
                <p className="text-xs text-slate-400 mb-3">
                  Select all facilities that your school provides. Only listed options are allowed.
                </p>
                <div className="space-y-4">
                  {Object.entries(FACILITY_CATEGORIES).map(([category, facilities]) => (
                    <div key={category} className="rounded-lg border border-slate-600 bg-slate-700/30 p-4">
                      <p className="text-sm font-semibold text-slate-200 mb-3">{category}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {facilities.map((facility) => {
                          const id = `create-${category}-${facility}`;
                          const checked = newSchoolData.facilities.includes(facility);
                          return (
                            <label key={id} htmlFor={id} className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                              <input
                                id={id}
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleNewSchoolFacility(facility)}
                                className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-blue-500 focus:ring-blue-400"
                              />
                              <span>{facility}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={creatingSchool}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded-lg font-medium transition flex items-center gap-2"
                >
                  {creatingSchool ? <Loader className="animate-spin" size={20} /> : <Send size={20} />}
                  {creatingSchool ? 'Creating...' : 'Create School & Open Dashboard'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100 px-4 py-6 md:px-8 md:py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800/70 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 transition"
          >
            Back to Normal Dashboard
          </button>
          <p className="text-slate-300 mb-2">Welcome back, {adminDisplayName}</p>
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-cyan-400 mb-2">
            School Admin Dashboard
          </h1>
          <hr />
          <br />
          <p className="text-slate-400 text-2xl font-medium ">School Name:- {school.name}</p>
          <br />
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Board</p>
              <p className="text-slate-100 font-medium">{school.board}</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Type</p>
              <p className="text-slate-100 font-medium capitalize">{school.type}</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Photos</p>
              <p className="text-slate-100 font-medium">{totalPhotos}</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Virtual Tour</p>
              <p className="text-slate-100 font-medium">{hasVirtualTour ? 'Available' : 'Not Added'}</p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-gap-2">
            <AlertCircle className="text-red-400 shrink-0" size={20} />
            <p className="text-red-400 ml-2">{error}</p>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div
            className={`mb-6 p-4 rounded-lg border flex items-center justify-between ${
              toast.type === 'success'
                ? 'bg-green-500/10 border-green-500/30 text-green-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            <p>{toast.message}</p>
            <button
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
              className="hover:opacity-80 transition"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-8 border-b border-slate-700 overflow-x-auto">
          <div className="flex min-w-max gap-2 md:gap-4">
            <TabButton active={activeTab === 'profile'} label="Profile Editor" onClick={() => setActiveTab('profile')} />
            <TabButton active={activeTab === 'photos'} label="Photo Manager" onClick={() => setActiveTab('photos')} />
            <TabButton active={activeTab === 'reviews'} label="Review Manager" onClick={() => setActiveTab('reviews')} />
            <TabButton active={activeTab === 'analytics'} label="Analytics" onClick={() => setActiveTab('analytics')} />
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 md:p-8">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Edit School Profile</h2>
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">School Name</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Central High School"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-400"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    placeholder="Describe your school..."
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-400"
                  />
                </div>

                {/* School Type & Board */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Type</label>
                    <select
                      value={formData.type || ''}
                      onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-400"
                      aria-label="School Type"
                      required
                    >
                      <option value="">Select Type</option>
                      <option value="primary">Primary</option>
                      <option value="secondary">Secondary</option>
                      <option value="international">International</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Board</label>
                    <select
                      value={formData.board || ''}
                      onChange={e => setFormData(prev => ({ ...prev, board: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:border-blue-400"
                      aria-label="School Board"
                      required
                    >
                      <option value="">Select Board</option>
                      <option value="CBSE">CBSE</option>
                      <option value="ICSE">ICSE</option>
                      <option value="IB">IB</option>
                      <option value="state">State</option>
                    </select>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="school@example.com"
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>

                {/* Website & Established Year */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Website</label>
                    <input
                      type="url"
                      value={formData.website || ''}
                      onChange={e => setFormData(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://example.com"
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Established Year</label>
                    <input
                      type="number"
                      value={formData.established || ''}
                      onChange={e => setFormData(prev => ({ ...prev, established: e.target.value ? parseInt(e.target.value) : undefined }))}
                      placeholder="2000"
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Address</label>
                  <textarea
                    value={formData.address || ''}
                    onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    rows={2}
                    placeholder="123 Main Street, City, State, ZIP"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-400"
                    required
                  />
                </div>

                {/* Fees */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Min Fees</label>
                    <input
                      type="number"
                      value={formData.fees?.min || ''}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        fees: { ...prev.fees, min: e.target.value ? parseFloat(e.target.value) : 0 }
                      }))}
                      placeholder="0"
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Max Fees</label>
                    <input
                      type="number"
                      value={formData.fees?.max || ''}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        fees: { ...prev.fees, max: e.target.value ? parseFloat(e.target.value) : 0 }
                      }))}
                      placeholder="0"
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>

                {/* Facilities */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Facilities</label>
                  <p className="text-xs text-slate-400 mb-3">
                    Select from predefined facilities only. Invalid custom entries are not allowed.
                  </p>
                  <div className="space-y-4">
                    {Object.entries(FACILITY_CATEGORIES).map(([category, facilities]) => (
                      <div key={category} className="rounded-lg border border-slate-600 bg-slate-700/30 p-4">
                        <p className="text-sm font-semibold text-slate-200 mb-3">{category}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {facilities.map((facility) => {
                            const id = `edit-${category}-${facility}`;
                            const checked = (formData.facilities || []).includes(facility);
                            return (
                              <label key={id} htmlFor={id} className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                                <input
                                  id={id}
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleProfileFacility(facility)}
                                  className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-blue-500 focus:ring-blue-400"
                                />
                                <span>{facility}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-slate-400">
                    Selected: {(formData.facilities || []).length} / {ALLOWED_FACILITIES.length}
                  </p>
                </div>

                {/* Virtual Tour URL */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Virtual Tour URL</label>
                  <input
                    type="url"
                    value={formData.virtualTourUrl || ''}
                    onChange={e => setFormData(prev => ({ ...prev, virtualTourUrl: e.target.value }))}
                    placeholder="https://example.com/tour"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-400"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex flex-col sm:flex-row justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!school) return;
                      setFormData({
                        ...school,
                        facilities: school.facilities || [],
                      });
                      showToast('success', 'Form reset to latest saved profile.');
                    }}
                    className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition"
                  >
                    Reset Changes
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded-lg font-medium transition flex items-center gap-2"
                  >
                    {savingProfile ? <Loader className="animate-spin" size={20} /> : <Send size={20} />}
                    {savingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Photos Tab */}
          {activeTab === 'photos' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Photo Manager</h2>

              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition mb-8 ${
                  isDragActive
                    ? 'border-blue-400 bg-blue-400/10'
                    : 'border-slate-600 bg-slate-700/30 hover:bg-slate-700/50'
                } ${uploadingPhotos ? 'pointer-events-none opacity-70' : ''}`}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto mb-4 text-slate-400" size={48} />
                <p className="text-slate-200 font-medium mb-2">
                  {isDragActive ? 'Drop images here' : 'Drag and drop images here'}
                </p>
                <p className="text-slate-400 text-sm">or click to select files (JPG, PNG, GIF, WEBP)</p>
              </div>

              {uploadingPhotos && (
                <div className="flex items-center justify-center gap-2 mb-8 text-blue-400">
                  <Loader className="animate-spin" size={20} />
                  Uploading...
                </div>
              )}

              {/* Current Photos */}
              <div>
                <h3 className="text-lg font-medium mb-4">Current Photos ({school.photos?.length || 0})</h3>
                {school.photos && school.photos.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {school.photos.map((photoUrl, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={photoUrl}
                          alt={`School photo ${idx + 1}`}
                          className="w-full h-40 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => handleDeletePhoto(photoUrl)}
                          className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition"
                          title="Delete photo"
                          aria-label="Delete photo"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400">No photos yet. Upload some to get started!</p>
                )}
              </div>
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Review Management ({reviewMeta.total})</h2>

              {reviewsLoading ? (
                <div className="flex items-center gap-2 text-slate-300">
                  <Loader className="animate-spin" size={18} />
                  Loading reviews...
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-6">
                  {reviews.map(review => (
                    <div key={review._id} className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
                      {/* Review Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="font-medium text-slate-100">{review.userId.name}</p>
                          <p className="text-sm text-slate-400">{review.userId.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  size={16}
                                  className={i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-500'}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-slate-400">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Review Content */}
                      {review.title && <h4 className="font-medium text-slate-100 mb-2">{review.title}</h4>}
                      {review.body && <p className="text-slate-300 mb-3">{review.body}</p>}
                      {(review.pros || review.cons) && (
                        <div className="bg-slate-600/30 rounded p-3 mb-4 text-sm text-slate-300">
                          {review.pros && <p><strong>Pros:</strong> {review.pros}</p>}
                          {review.cons && <p><strong>Cons:</strong> {review.cons}</p>}
                        </div>
                      )}

                      {/* Admin Response */}
                      {review.adminResponse ? (
                        <div className="bg-blue-600/20 border border-blue-600/30 rounded p-4 mb-4">
                          <p className="text-sm text-slate-400 mb-2">Admin Response:</p>
                          <p className="text-slate-100">{review.adminResponse.text}</p>
                          <p className="text-xs text-slate-400 mt-2">
                            {new Date(review.adminResponse.respondedAt || '').toLocaleDateString()}
                          </p>
                        </div>
                      ) : (
                        <div>
                          {respondingToReview === review._id ? (
                            <div className="space-y-3">
                              <textarea
                                value={responseText[review._id] || ''}
                                onChange={e => setResponseText(prev => ({ ...prev, [review._id]: e.target.value }))}
                                placeholder="Write your response..."
                                rows={3}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-400"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSubmitResponse(review._id)}
                                  disabled={submittingResponse[review._id] || !responseText[review._id]?.trim()}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded font-medium transition flex items-center gap-2"
                                >
                                  {submittingResponse[review._id] ? (
                                    <Loader className="animate-spin" size={16} />
                                  ) : (
                                    <Send size={16} />
                                  )}
                                  Submit
                                </button>
                                <button
                                  onClick={() => {
                                    setRespondingToReview(null);
                                    setResponseText(prev => ({ ...prev, [review._id]: '' }));
                                  }}
                                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-medium transition"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setRespondingToReview(review._id)}
                              className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition"
                            >
                              <MessageSquare size={18} />
                              Respond to Review
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-slate-400">
                      Page {reviewMeta.page} of {Math.max(reviewMeta.totalPages, 1)}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setReviewPage(prev => Math.max(1, prev - 1))}
                        disabled={reviewMeta.page <= 1}
                        className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setReviewPage(prev => Math.min(reviewMeta.totalPages, prev + 1))}
                        disabled={reviewMeta.page >= reviewMeta.totalPages}
                        className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-5 text-slate-300">
                  No reviews yet. Once parents submit reviews, you can respond publicly from this tab.
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div>
              <h2 className="text-2xl font-bold mb-8">Analytics</h2>

              {analyticsLoading && (
                <div className="space-y-4 mb-8 animate-pulse">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="h-28 bg-slate-700/40 rounded-lg" />
                    <div className="h-28 bg-slate-700/40 rounded-lg" />
                    <div className="h-28 bg-slate-700/40 rounded-lg" />
                  </div>
                  <div className="h-96 bg-slate-700/40 rounded-lg" />
                </div>
              )}

              {!analyticsLoading && analytics && (
                <>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <MetricCard
                  title="Profile Views"
                  value={analytics.totalProfileViews}
                  icon={<Eye className="text-blue-400" size={40} />}
                />
                <MetricCard
                  title="Average Rating"
                  value={
                    <div className="flex items-center gap-2">
                      <p>{analytics.averageRating}</p>
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={16}
                            className={i < Math.round(analytics.averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-500'}
                          />
                        ))}
                      </div>
                    </div>
                  }
                  icon={<Star className="text-yellow-400" size={40} />}
                />
                <MetricCard
                  title="Total Reviews"
                  value={analytics.totalReviews}
                  icon={<MessageSquare className="text-green-400" size={40} />}
                />
              </div>

              {/* Review Trend Chart */}
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
                <h3 className="text-lg font-medium mb-6 flex items-center gap-2">
                  <TrendingUp size={20} className="text-blue-400" />
                  Review Trend (Count & Rating)
                </h3>
                {analytics.reviewsByMonth.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={analytics.reviewsByMonth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                      <XAxis dataKey="month" stroke="rgba(148,163,184,0.5)" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(30,41,59,0.8)',
                          border: '1px solid rgba(71,85,105,0.5)',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: '#e2e8f0' }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="reviews"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6' }}
                        yAxisId="left"
                        name="Review Count"
                      />
                      <Line
                        type="monotone"
                        dataKey="rating"
                        stroke="#fbbf24"
                        strokeWidth={2}
                        dot={{ fill: '#fbbf24' }}
                        yAxisId="right"
                        name="Avg Rating"
                      />
                      <YAxis yAxisId="left" stroke="rgba(59,130,246,0.5)" />
                      <YAxis yAxisId="right" orientation="right" stroke="rgba(251,191,36,0.5)" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-400 text-center py-12">No review data yet</p>
                )}
              </div>
                </>
              )}

              {!analyticsLoading && !analytics && (
                <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-5 text-slate-300">
                  Analytics are unavailable right now. Please refresh this tab in a few moments.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
