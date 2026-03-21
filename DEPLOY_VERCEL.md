# Vercel Deployment Guide for SchoolDekho Frontend

This guide walks through deploying the SchoolDekho frontend to Vercel.

## Prerequisites

- Vercel account (https://vercel.com)
- Git repository with this frontend code
- Backend API deployed (e.g., on Render)
- Google Maps API key

## Step 1: Create a Vercel Project

1. Go to https://vercel.com/dashboard
2. Click "Add New Project"
3. Select "Import Git Repository"
4. Choose your GitHub repository
5. Click "Import"

## Step 2: Configure Build Settings

In Vercel's project settings:

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

These should be auto-detected. Review and confirm.

## Step 3: Set Environment Variables

In Vercel Dashboard > Project Settings > Environment Variables:

Add the following variables:

```
VITE_API_URL=https://schooldekho-api.onrender.com
VITE_GOOGLE_MAPS_KEY=your_google_maps_api_key_here
VITE_SITE_URL=https://schooldekho.vercel.app
```

**Important**:
- `VITE_API_URL` should match your Render backend URL
- `VITE_GOOGLE_MAPS_KEY` is the same key used in backend (if needed for frontend)
- Environment variables should start with `VITE_` to be accessible in frontend

## Step 4: Deploy

1. Click "Deploy"
2. Vercel will build and deploy automatically
3. You'll receive a unique URL (e.g., `schooldekho.vercel.app`)
4. Copy this URL for CORS configuration in backend

## Step 5: Update Backend CORS Configuration

After Vercel deployment, your frontend URL is live. Now:

1. Go back to Render dashboard for your backend
2. Update the `CLIENT_ORIGIN` environment variable to your Vercel URL
3. Example: `https://schooldekho.vercel.app`
4. Redeploy the backend
5. Wait 5 minutes for changes to take effect

## Step 6: Test the Deployment

1. Open your Vercel domain in browser
2. Test all main functionality:
   - Login/Register
   - Search for schools
   - View school details
   - Add to compare
3. Open browser DevTools > Console to check for errors

## Domain Configuration (Optional)

To use a custom domain:

1. Vercel Dashboard > Project Settings > Domains
2. Click "Add Domain"
3. Enter your domain (e.g., `schooldekho.com`)
4. Follow DNS configuration instructions
5. Update backend `CLIENT_ORIGIN` to your custom domain

## Environment-Specific Deployments

Vercel supports separate environments:

### Preview Deployments
- Created automatically for Pull Requests
- Uses preview environment variables
- Useful for testing changes

### Production Deployment
- Main branch deployment
- Uses production environment variables
- Production URL is the primary domain

### Staging Deployment (Optional)
- Deploy to staging branch
- Use staging API (different backend)
- Test before production

To set up:
1. Project Settings > Git
2. Configure which branch is production
3. Set environment variables per deployment

## Performance Optimization

### Enable Compression
- Vercel automatically compresses responses
- No additional configuration needed

### Image Optimization
- Vercel has built-in image optimization
- Consider using `<Image>` component from `next/image` if migrating to Next.js
- Current Vite setup serves images as-is

### Caching Headers
- Add to `vercel.json` for static assets:

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

## Monitoring

Vercel provides built-in monitoring:

1. **Analytics**: Dashboard shows page load times, redirect counts
2. **Logs**: Real-time deployment logs
3. **Alerts**: Email notifications for deployment failures

To view:
- Click project name > Analytics
- Click project name > Logs

## Debugging Deployment Issues

### Build Fails
- Check "Deployments" tab for error logs
- Common issue: Missing environment variables
- Solution: Add missing `VITE_*` variables

### CORS Errors in Frontend
- Check `VITE_API_URL` is correct in environment variables
- Verify backend `CLIENT_ORIGIN` matches Vercel URL
- Backend must explicitly allow the Vercel URL

### 404 on Routes
- Vercel SPA handling: Add `vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/"
    }
  ]
}
```

### Blank Page on Load
- Check browser DevTools Console for errors
- Verify environment variables are set
- Clear browser cache (Ctrl+Shift+Del)

## Rollback

To rollback to a previous deployment:

1. Go to "Deployments" tab
2. Find the previous working deployment
3. Click the 3-dots menu > "Promote to Production"

## Cost Considerations

- **Vercel**: Free tier available (100 GB/month bandwidth)
- When usage exceeds limits, charged per extra GB used
- Typically $0 for most projects

For production with high traffic, budget $10-50/month.

## Advanced: Custom Build Output

If you need to modify the build directory or command, edit `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

## Security Best Practices

- ✅ Use `VITE_*` prefix for client-side env variables
- ✅ Never store API keys in environment for client code
- ✅ Use HTTPS only (Vercel enforces this)
- ✅ Implement rate limiting on backend
- ✅ Monitor deployment logs for suspicious activity

## Performance Benchmarks

Expected metrics for SchoolDekho:

- **First Contentful Paint**: < 2s
- **Largest Contentful Paint**: < 3s
- **Cumulative Layout Shift**: < 0.1

Monitor these in Vercel Analytics and Google PageSpeed Insights.
