import { useAuth } from '../hooks/useAuth';
import { useSeo } from '../hooks/useSeo';
import { Link } from 'react-router-dom';
import {Settings, Search, GitCompareArrows } from 'lucide-react';

export default function DashboardPage() {
  useSeo({
    title: 'Dashboard',
    description: 'Access your SchoolDekho dashboard to manage your saved schools, reviews, and account settings.',
  });
  const { user, logout } = useAuth();

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-300 text-sm mt-1">Welcome back, {user?.name}.</p>
        </div>
        <button onClick={logout} className="self-start sm:self-auto rounded-lg border border-rose-500/40 px-3 py-2 text-sm font-medium text-rose-300 hover:bg-rose-500/10 transition-colors">
          Log Out
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* <div className="border border-slate-700/70 rounded-2xl p-6 bg-linear-to-br from-slate-900 to-slate-800">
          <Building2 className="w-5 h-5 text-sky-700 mb-3" />
          <h2 className="text-lg font-semibold mb-1 text-white">School Records</h2>
          <p className="text-sm text-slate-300">Manage listed schools, update details, and keep data accurate.</p>
        </div> */}
        <Link to="/settings" className="border border-slate-700/70 rounded-2xl p-6 bg-linear-to-br from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 transition-colors">
          <Settings className="w-5 h-5 text-sky-700 mb-3" />
          <h2 className="text-lg font-semibold mb-1 text-white">Account Settings</h2>
          <p className="text-sm text-slate-300">See account preferences and profile details.</p>
        </Link>

        {/* Admin Dashboard Card - Only visible for school-admin users */}
        {user?.role === 'school-admin' && (
          <Link
            to={user.schoolId ? `/admin/dashboard/${user.schoolId}` : '/admin/dashboard'}
            className="border border-blue-700/70 rounded-2xl p-6 bg-linear-to-br from-blue-900/50 to-blue-800/50 hover:from-blue-900 hover:to-blue-800 transition-colors"
          >
            <Settings className="w-5 h-5 text-blue-400 mb-3" />
            <h2 className="text-lg font-semibold mb-1 text-white">School Admin Dashboard</h2>
            <p className="text-sm text-slate-300">Manage your school profile, photos, reviews, and analytics.</p>
          </Link>
        )}
      </div>

      <div className="mt-6 border border-slate-700/70 rounded-2xl p-6 bg-linear-to-r from-slate-900 to-slate-800">
        <h3 className="text-base font-semibold text-white mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link to="/search" className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800/80 transition-colors">
            <Search className="w-4 h-4" /> Search Schools
          </Link>
          <Link to="/compare" className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800/80 transition-colors">
            <GitCompareArrows className="w-4 h-4" /> Compare List
          </Link>
        </div>
      </div>
    </div>
  );
}
