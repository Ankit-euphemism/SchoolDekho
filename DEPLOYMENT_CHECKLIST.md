# SchoolDekho Production Deployment Checklist

Complete this checklist before launching to production.

## Pre-Deployment (Backend)

- [ ] Backend code reviewed and tested locally
- [ ] All dependencies updated to latest stable versions
- [ ] Environment variables configured in `.env` (never commit)
- [ ] Cloudinary account created and API keys configured
- [ ] MongoDB Atlas database created
- [ ] JWT secret generated (strong random string)
- [ ] CORS origins configured correctly
- [ ] Rate limiting enabled
- [ ] Error handling tested for edge cases
- [ ] Database backup strategy planned

## Pre-Deployment (Frontend)

- [ ] Frontend code reviewed and tested locally
- [ ] All dependencies updated
- [ ] Production build tested (`npm run build`)
- [ ] Web manifest loads correctly and install prompt works on supported browsers
- [ ] SEO meta tags added to all pages
- [ ] Images optimized for web
- [ ] API endpoint URLs use environment variables
- [ ] Google Maps API key restricted to production domain
- [ ] Toast notifications working
- [ ] Error boundary catches and handles errors

## Render Backend Deployment

- [ ] Render account created
- [ ] Git repository connected
- [ ] MongoDB Atlas IP whitelist updated with Render IP
- [ ] All environment variables set in Render dashboard
- [ ] Build command verified (`npm install`)
- [ ] Start command verified (`npm start`)
- [ ] Deployment test successful
- [ ] Logs checked for errors
- [ ] API endpoints responding correctly
- [ ] Health endpoint responds (`/api/health`)
- [ ] Database connection verified

## Vercel Frontend Deployment

- [ ] Vercel account created
- [ ] GitHub repository connected
- [ ] Environment variables set (VITE_API_URL, VITE_GOOGLE_MAPS_KEY)
- [ ] Build configuration auto-detected (Vite preset)
- [ ] Initial deployment test successful
- [ ] Production URL obtained
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active (free on Vercel)

## Post-Deployment Verification

### Backend
- [ ] API responds to requests
  ```bash
  curl https://your-api.onrender.com/api/schools
  ```
- [ ] Database queries execute successfully
- [ ] File uploads to Cloudinary work
- [ ] Error responses return correct status codes
- [ ] Rate limiting triggers appropriately
- [ ] CORS headers present in responses

### Frontend
- [ ] Frontend loads without errors
- [ ] All pages render correctly
- [ ] API calls succeed (check network tab)
- [ ] Authentication flow works
- [ ] Search functionality filters correctly
- [ ] School profiles load with images
- [ ] Comparison feature works
- [ ] Web manifest present and valid (check DevTools > Application > Manifest)

### Security
- [ ] HTTPS enforced on frontend
- [ ] HTTPS enforced on backend
- [ ] CORS properly configured (no `*` origin)
- [ ] API keys not exposed in frontend code
- [ ] Database credentials not in git history
- [ ] Sensitive logs removed before production

### Performance
- [ ] Frontend loads in < 3 seconds
- [ ] First Contentful Paint < 2s
- [ ] Images load lazily
- [ ] Pages lazy-loaded with Suspense
- [ ] Toast notifications don't block UI
- [ ] Error boundary prevents full page crashes

## Google Maps & External Services

- [ ] Google Maps API key restricted to production domain
- [ ] Cloudinary URLs whitelisted
- [ ] API rate limits set appropriately
- [ ] Timeout values reasonable (10-15s)

## Database & Backups

- [ ] MongoDB Atlas backup enabled
- [ ] Backup frequency: daily
- [ ] Test restore from backup monthly
- [ ] MongoDB Atlas monitoring enabled
- [ ] CPU/Memory thresholds set for alerts

## Monitoring & Alerts

### Render Backend
- [ ] Error tracking enabled
- [ ] Email alerts for deployment failures
- [ ] Response time monitoring active
- [ ] CPU/Memory usage monitored

### Vercel Frontend
- [ ] Analytics enabled
- [ ] Web Vitals monitoring active
- [ ] Deployment failure notifications enabled
- [ ] Custom metrics tracked

### General
- [ ] Error logs reviewed daily (first week)
- [ ] Performance logs reviewed
- [ ] User feedback channels set up

## Maintenance & Updates

- [ ] Dependency update schedule planned
- [ ] Security patch policy defined
- [ ] Staging environment for testing updates
- [ ] Rollback procedure documented
- [ ] Team communication plan for incidents

## Documentation

- [ ] Deployment docs updated
- [ ] API documentation published
- [ ] User guide created
- [ ] Admin documentation written
- [ ] Contributor guidelines updated
- [ ] Emergency contact list created

## Post-Launch (First Week)

- [ ] Monitor logs daily for errors
- [ ] Check user feedback regularly
- [ ] Monitor API response times
- [ ] Verify billing and usage metrics
- [ ] Test backup restore procedure
- [ ] Document any issues found

## Optional Enhancements (Post-Launch)

- [ ] Add health check endpoint (`/api/health`)
- [ ] Implement detailed error tracking (Sentry)
- [ ] Setup analytics (Google Analytics, etc)
- [ ] Add performance monitoring (DataDog, New Relic)
- [ ] Implement WAF for backend (DDoS protection)
- [ ] Setup CDN for static assets
- [ ] Implement dark mode toggle
- [ ] Add multi-language support

## Scaling Considerations (When Needed)

- [ ] Move to paid Render tier for better performance
- [ ] Add database indexing for slow queries
- [ ] Implement caching layer (Redis)
- [ ] Setup load balancing
- [ ] Consider separate API key per client
- [ ] Implement request queuing for heavy loads

---

**Sign-off:**

- [ ] Backend Team Lead: __________ Date: __________
- [ ] Frontend Team Lead: __________ Date: __________
- [ ] DevOps/Deployment: __________ Date: __________
- [ ] Security Review: __________ Date: __________
