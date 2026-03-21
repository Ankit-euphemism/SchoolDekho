import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMe, type AuthUser } from '../api/auth';

function Settings() {
  const [hasToken] = useState(() => Boolean(localStorage.getItem('accessToken')));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(hasToken);
  const [error, setError] = useState(
    hasToken ? '' : 'You are not logged in. Please log in to view account settings.',
  );

  useEffect(() => {
    if (!hasToken) {
      return;
    }

    getMe()
      .then((me) => {
        setUser(me);
      })
      .catch(() => {
        setError('Unable to load your account settings right now. Please try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [hasToken]);

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Account Settings</h1>
        <p className="text-slate-300 text-sm mt-1">Your profile details from your authenticated account.</p>
      </div>

      <div className="rounded-2xl border border-slate-700/70 bg-linear-to-br from-slate-900 to-slate-800 p-6">
        {loading && <p className="text-slate-300">Loading your account...</p>}

        {!loading && error && (
          <div className="space-y-3">
            <p className="text-rose-300 text-sm">{error}</p>
            <Link
              to="/login"
              className="inline-flex items-center rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800/80 transition-colors"
            >
              Go to Login
            </Link>
          </div>
        )}

        {!loading && !error && user && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400">Name</p>
              <p className="text-white font-medium mt-1">{user.name}</p>
            </div>
            <div>
              <p className="text-slate-400">Email</p>
              <p className="text-white font-medium mt-1">{user.email}</p>
            </div>
            <div>
              <p className="text-slate-400">Role</p>
              <p className="text-white font-medium mt-1 capitalize">{user.role}</p>
            </div>
            <div>
              <p className="text-slate-400">User ID</p>
              <p className="text-white font-medium mt-1 break-all">{user.id}</p>
            </div>
            {user.schoolId && (
              <div className="sm:col-span-2">
                <p className="text-slate-400">Linked School ID</p>
                <p className="text-white font-medium mt-1 break-all">{user.schoolId}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings;
