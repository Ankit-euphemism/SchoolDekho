import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CompareProvider } from './contexts/CompareContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Lazy load all page components
const HomePage = lazy(() => import('./pages/HomePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const SchoolProfilePage = lazy(() => import('./pages/SchoolProfilePage'));
const ComparePage = lazy(() => import('./pages/ComparePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SchoolMapPage = lazy(() => import('./pages/SchoolMapPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Settings = lazy(() => import('./components/Settings'));

function App() {
  return (
    <AuthProvider>
      <CompareProvider>
        <Routes>
          <Route path="/" element={<Layout><HomePage /></Layout>} />
          <Route path="/search" element={<Layout><SearchPage /></Layout>} />
          <Route path="/school/:id" element={<Layout><SchoolProfilePage /></Layout>} />
          <Route path="/compare" element={<Layout><ComparePage /></Layout>} />
          <Route path="/login" element={<Layout><LoginPage /></Layout>} />
          <Route path="/register" element={<Layout><RegisterPage /></Layout>} />
          <Route path="/map" element={<Layout><SchoolMapPage /></Layout>} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Layout><DashboardPage /></Layout>} />
            <Route path="/settings" element={<Layout><Settings /></Layout>} />
          </Route>

          {/* Admin-only routes */}
          <Route element={<ProtectedRoute requiredRole="school-admin" />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/dashboard/:schoolId" element={<AdminDashboard />} />
          </Route>
        </Routes>
      </CompareProvider>
    </AuthProvider>
  );
}

export default App;