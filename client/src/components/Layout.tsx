import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCompare } from '../hooks/useCompare';
import {
  GraduationCap,
  Search,
  Map,
  GitCompareArrows,
  LayoutDashboard,
  LogIn,
  LogOut,
  UserPlus,
  Menu,
  X,
  Heart,
  // Mail,
  // Phone,
} from 'lucide-react';

function Navbar() {
  const { user, logout } = useAuth();
  const { compareList } = useCompare();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navLink = (to: string, label: string, icon: ReactNode, badge?: number) => (
    <Link
      to={to}
      onClick={() => setMobileOpen(false)}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative
        ${isActive(to)
          ? 'bg-sky-500/20 text-sky-200'
          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
        }`}
    >
      {icon}
      {label}
      {badge != null && badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-slate-700/80 bg-slate-950/70 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-sky-700 rounded-xl flex items-center justify-center transition-colors group-hover:bg-sky-800">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">
              SchoolDekho
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLink('/search', 'Search', <Search className="w-4 h-4" />)}
            {navLink('/map', 'Map', <Map className="w-4 h-4" />)}
            {navLink('/compare', 'Compare', <GitCompareArrows className="w-4 h-4" />, compareList.length)}
            {user && navLink('/dashboard', 'Dashboard', <LayoutDashboard className="w-4 h-4" />)}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-sky-700 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{user.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-200">{user.name}</span>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-300 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 rounded-lg transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-sky-700 rounded-lg hover:bg-sky-800 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Sign Up
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-slate-300 hover:bg-slate-800/70 rounded-lg"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-slate-700/80 bg-slate-950/95 px-4 py-3 space-y-1">
          {navLink('/search', 'Search Schools', <Search className="w-4 h-4" />)}
          {navLink('/map', 'Explore Map', <Map className="w-4 h-4" />)}
          {navLink('/compare', 'Compare', <GitCompareArrows className="w-4 h-4" />, compareList.length)}
          {user && navLink('/dashboard', 'Dashboard', <LayoutDashboard className="w-4 h-4" />)}
          <hr className="my-2 border-slate-700/80" />
          {user ? (
            <button
              onClick={() => { logout(); setMobileOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-rose-300 hover:bg-rose-500/10 rounded-lg"
            >
              <LogOut className="w-4 h-4" /> Log Out
            </button>
          ) : (
            <>
              {navLink('/login', 'Log In', <LogIn className="w-4 h-4" />)}
              {navLink('/register', 'Sign Up', <UserPlus className="w-4 h-4" />)}
            </>
          )}
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-sky-700 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">SchoolDekho</span>
            </Link>
            <p className="text-sm leading-relaxed">
              Helping parents find the perfect school for their children with data-driven insights and transparent comparisons.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Explore</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/search" className="hover:text-white transition-colors">Search Schools</Link></li>
              <li><Link to="/map" className="hover:text-white transition-colors">Map View</Link></li>
              <li><Link to="/compare" className="hover:text-white transition-colors">Compare Schools</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Account</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/login" className="hover:text-white transition-colors">Log In</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Sign Up</Link></li>
              <li><Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
            </ul>
          </div>

          {/* <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Contact</h3>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center gap-2"><Mail className="w-4 h-4" /> support@schoolfinder.in</li>
              <li className="flex items-center gap-2"><Phone className="w-4 h-4" /> +91 98765 43210</li>
            </ul>
          </div> */}
        </div>

        <div className="border-t border-slate-700 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
          <p>©2025 SchoolDekho. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> for parents & educators
          </p>
        </div>
      </div>
    </footer>
  );
}

// Pages where we hide the navbar/footer (full-screen layouts)
const FULL_SCREEN_PAGES = ['/map'];

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isFullScreen = FULL_SCREEN_PAGES.includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col text-slate-100">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      {!isFullScreen && <Footer />}
    </div>
  );
}
