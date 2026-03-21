# SchoolDekho Quick Reference Card

## File Structure - New Files Added

```
client/
├── src/
│   ├── components/
│   │   ├── ErrorBoundary.tsx (NEW)
│   │   ├── PageLoadingFallback.tsx (NEW)
│   │   ├── SchoolCardSkeleton.tsx (NEW)
│   │   ├── SchoolProfileSkeleton.tsx (NEW)
│   │   └── ... (existing)
│   ├── hooks/
│   │   ├── useSeo.ts (NEW)
│   │   ├── useToast.ts (NEW)
│   │   └── ... (existing)
│   ├── sw.ts (legacy file, currently not used in build)
│   ├── main.tsx (UPDATED - HelmetProvider, Toaster, ErrorBoundary)
│   ├── App.tsx (UPDATED - lazy() imports)
│   └── pages/
│       ├── HomePage.tsx (UPDATED - useSeo)
│       ├── SearchPage.tsx (UPDATED - useSeo, infinite scroll)
│       ├── SchoolProfilePage.tsx (UPDATED - useSeo, skeleton)
│       ├── ComparePage.tsx (UPDATED - useSeo)
│       ├── LoginPage.tsx (UPDATED - useSeo)
│       ├── RegisterPage.tsx (UPDATED - useSeo)
│       ├── DashboardPage.tsx (UPDATED - useSeo)
│       ├── SchoolMapPage.tsx (UPDATED - useSeo)
│       └── AdminDashboard.tsx (UPDATED - useSeo)
├── vite.config.ts (UPDATED - Vite + Tailwind config)
├── index.html (UPDATED - manifest link)
├── .env.example (UPDATED - deployment env vars)
└── package.json (UPDATED - new dependencies)

server/
└── .env.example (UPDATED - deployment env vars)

root/
├── PRODUCTION_FEATURES.md (NEW)
├── DEPLOY_RENDER.md (NEW)
├── DEPLOY_VERCEL.md (NEW)
└── DEPLOYMENT_CHECKLIST.md (NEW)
```

## New Dependencies

### Client
```json
{
  "dependencies": {
    "react-helmet-async": "^1.3.0",
    "react-hot-toast": "^2.4.0"
  },
  "devDependencies": {
    "@types/react-helmet-async": "^1.0.3"
  }
}
```

## Key Components & Hooks

### Components
| Component | Purpose | File |
|-----------|---------|------|
| `ErrorBoundary` | Catches React errors globally | ErrorBoundary.tsx |
| `PageLoadingFallback` | Loading skeleton for pages | PageLoadingFallback.tsx |
| `SchoolCardSkeleton` | Placeholder while card loads | SchoolCardSkeleton.tsx |
| `SchoolProfileSkeleton` | Placeholder for profile page | SchoolProfileSkeleton.tsx |

### Hooks
| Hook | Purpose | Usage |
|------|---------|-------|
| `useSeo()` | Set meta tags | `useSeo({ title, description, image })` |
| `useToast()` | Show notifications | `const { showSuccess, showError } = useToast()` |
| `useAuth()` | Auth context (existing) | User login state |
| `useCompare()` | Compare context (existing) | School comparison |

## Code Examples

### Add SEO to a Page
```tsx
import { useSeo } from '../hooks/useSeo';

export default function MyPage() {
  useSeo({
    title: 'Page Title',
    description: 'Short description for search engines',
  });
  return <div>Content</div>;
}
```

### Show Toast Notifications
```tsx
import { useToast } from '../hooks/useToast';

export default function MyComponent() {
  const { showSuccess, showError } = useToast();
  
  async function handleSubmit() {
    try {
      await submitForm();
      showSuccess('Form submitted!');
    } catch (error) {
      showError('Failed to submit. Try again.');
    }
  }
  
  return <button onClick={handleSubmit}>Submit</button>;
}
```

### Use Lazy Loading
```tsx
import { lazy, Suspense } from 'react';
import PageLoadingFallback from './PageLoadingFallback';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

export default function Parent() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

## Configuration Files

### Frontend Environment Variables
```
VITE_API_URL=https://your-api.onrender.com
VITE_GOOGLE_MAPS_KEY=your_key
```

### Backend Environment Variables
```
MONGO_URI=mongodb+srv://user:pass@cluster
JWT_SECRET=strong_random_string
CLOUDINARY_CLOUD_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
CLIENT_ORIGIN=https://your-frontend.vercel.app
```

## Deployment Steps

### Backend (Render)
1. Create account at render.com
2. Connect GitHub repo
3. Set environment variables
4. Add Render IP to MongoDB Atlas whitelist
5. Deploy (auto-deploys on git push)

### Frontend (Vercel)
1. Create account at vercel.com
2. Connect GitHub repo
3. Set environment variables
4. Deploy (auto-deploys on git push)

## Testing Checklist

- [ ] Pages lazy-load (slower in DevTools)
- [ ] SEO meta tags in Page Source (not DevTools)
- [ ] Error boundary catches and shows error UI
- [ ] Toast notifications appear on actions
- [ ] Web manifest loads in DevTools > Application
- [ ] Infinite scroll loads more schools
- [ ] Skeletons show during loading
- [ ] Mobile responsive

## Common Tasks

### Test Web Manifest
1. DevTools > Application > Manifest
2. Confirm icon, name, and start URL are present

### Test API Connectivity
1. Open app and run login/search/profile flows
2. Confirm requests hit your configured backend URL

### Check SEO Tags
1. Right-click page > View Page Source
2. Look for `<meta>` tags in `<head>`
3. Title should be visible
4. Description, og:image, etc. present

### Monitor Performance
1. DevTools > Performance tab > Record
2. Interact with page
3. Stop recording
4. Check metrics (LCP, FID, CLS)

## Useful URLs

- Render Dashboard: https://render.com/dashboard
- Vercel Dashboard: https://vercel.com/dashboard
- MongoDB Atlas: https://cloud.mongodb.com
- Cloudinary Dashboard: https://cloudinary.com/console
- Google PageSpeed: https://pagespeed.web.dev/

## Emergency Fixes

### Manifest Issues
- Verify `public/manifest.json` exists and is valid JSON
- Verify `index.html` links to `/manifest.json`

### Clear Local Storage
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Force Clear Cache
Windows/Linux: Ctrl+Shift+Del
Mac: Cmd+Shift+Delete

## Documentation Files

- **PRODUCTION_FEATURES.md** - Detailed feature documentation
- **DEPLOY_RENDER.md** - Backend deployment guide
- **DEPLOY_VERCEL.md** - Frontend deployment guide
- **DEPLOYMENT_CHECKLIST.md** - Pre/post deployment tasks

---

**Last Updated**: March 21, 2026
**Status**: ✅ Production Ready
