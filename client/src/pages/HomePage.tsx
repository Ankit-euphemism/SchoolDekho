import { Link } from 'react-router-dom';
import { Search, GitCompareArrows, LayoutDashboard, MapPin } from 'lucide-react';
import { useSeo } from '../hooks/useSeo';

export default function HomePage() {
  useSeo({
    title: 'SchoolDekho - Find & Compare Schools Near You',
    description: 'Discover the best schools near your location. Filter by type, board, ratings, and facilities. Compare schools side-by-side and make informed educational decisions for your child.',
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14">
      <section className="rounded-2xl border border-slate-700/70 bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8 sm:p-10 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
        <p className="text-sm font-semibold text-sky-700 mb-2">Trusted by families and school admins</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-3">
          Find, compare, and manage schools with clarity
        </h1>
        <p className="text-slate-300 max-w-2xl mb-8">
          A clean workspace for parents exploring options and admins organizing information in one place.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            to="/search"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-500 bg-slate-800/70 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-700 transition-colors"
          >
            <Search className="h-4 w-4" />
            Start Searching
          </Link>
          <Link
            to="/compare"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-500 bg-slate-800/70 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-700 transition-colors"
          >
            <GitCompareArrows className="h-4 w-4" />
            Compare Schools
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-500 bg-slate-800/70 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-700 transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            Open Dashboard
          </Link>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            title: 'Parent Friendly Search',
            text: 'Filter by location, school type, and key details that matter for your child.',
            icon: Search,
          },
          {
            title: 'Simple Side-by-Side Compare',
            text: 'Review fees, facilities, and ratings together before making a decision.',
            icon: GitCompareArrows,
          },
          {
            title: 'Map-Based Discovery',
            text: 'Explore schools around you and jump to profiles in one click.',
            icon: MapPin,
          },
        ].map(({ title, text, icon: Icon }) => (
          <article key={title} className="rounded-2xl border border-slate-700/70 bg-linear-to-b from-slate-900/90 to-slate-800/90 p-5 backdrop-blur-sm">
            <Icon className="w-5 h-5 text-sky-700 mb-3" />
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <p className="text-sm text-slate-300 mt-1.5">{text}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-700/70 bg-linear-to-r from-slate-900 to-slate-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-2">Quick Start</h2>
        <p className="text-sm text-slate-300 mb-4">
          Use search to shortlist schools, add up to three to compare, then review details in profiles and map view.
        </p>
        <Link to="/search" className="text-sm font-semibold text-sky-300 hover:text-sky-200">
          Go to Search
        </Link>
      </section>
    </div>
  );
}
