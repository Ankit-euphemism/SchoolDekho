import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import PageLoadingFallback from './components/PageLoadingFallback.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <Suspense fallback={<PageLoadingFallback />}>
            <App />
          </Suspense>
        </ErrorBoundary>
        <Toaster
          position="top-right"
          reverseOrder={false}
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1f2937',
              color: '#fff',
              borderRadius: '0.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            },
            success: {
              style: {
                background: '#10b981',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#10b981',
              },
            },
            error: {
              style: {
                background: '#ef4444',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#ef4444',
              },
            },
          }}
        />
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
)
