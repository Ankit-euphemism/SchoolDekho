# Render Deployment Guide for SchoolDekho Backend

This guide walks through deploying the SchoolDekho backend to Render.

## Prerequisites

- Render account (https://render.com)
- Git repository with this backend code
- MongoDB Atlas database
- Cloudinary account for image uploads

## Step 1: Setup MongoDB Atlas IP Whitelist

1. Go to MongoDB Atlas (https://cloud.mongodb.com)
2. Navigate to Network Access > IP Whitelist
3. Add Render's static IP: **34.87.145.92** (or check Render docs for current IPs)
4. Alternative: Allow all IPs (0.0.0.0/0) for development, then restrict later

## Step 2: Create a Web Service on Render

1. Log in to Render Dashboard
2. Click "New +" > "Web Service"
3. Connect your GitHub repository
4. Fill in the details:
   - **Name**: `schooldekho-api` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free tier or paid as needed

## Step 3: Configure Environment Variables

In the Render dashboard, go to Environment Variables and add:

```
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/schooldekho
JWT_SECRET=use_a_strong_random_string_here
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
CLIENT_ORIGIN=https://schooldekho.vercel.app
```

**Important**: 
- Never commit `.env` files to git
- Use strong, unique values for secret keys
- The `CLIENT_ORIGIN` should match your Vercel frontend URL

## Step 4: Whitelist the Render IP in MongoDB Atlas

1. Render will provide a static IP when you create the service
2. In MongoDB Atlas > Network Access > IP Whitelist
3. Add this IP address
4. Wait for the firewall rule to activate (usually 5-10 minutes)

## Step 5: Deploy

1. Push your changes to GitHub
2. Render will automatically detect the push and start deployment
3. Monitor the deployment in the Render dashboard

## Debugging Deployment Issues

### Cannot Connect to MongoDB
- Check IP whitelist in MongoDB Atlas
- Verify `MONGO_URI` format is correct
- Ensure `NODE_ENV=production` is set

### CORS Errors
- Check `CLIENT_ORIGIN` matches your frontend URL exactly
- Include protocol (https://) in the origin URL

### Static IP Not Working
- Render's free tier may use shared IPs
- Consider upgrading to paid tier for dedicated IP
- Or temporarily allow all IPs (0.0.0.0/0) in MongoDB Atlas

## Step 6: Verify Deployment

Test your API:
```bash
curl https://schooldekho-api.onrender.com/api/schools
curl https://schooldekho-api.onrender.com/api/health
```

You should receive a JSON response with school data.

## Monitoring

1. View logs in Render Dashboard > Service Logs
2. Monitor resource usage in Render Dashboard > Metrics
3. Set email notifications for deployment failures

## Scaling & Performance

- Free tier on Render auto-spins down after 15 minutes of inactivity
- For production, consider upgrading to a paid tier with 24/7 uptime
- Use caching headers for API responses to reduce load
- Monitor MongoDB Atlas CPU and memory usage

## Security Best Practices

- ✅ Use strong, unique JWT secret
- ✅ Enable IP whitelist in MongoDB Atlas
- ✅ Use HTTPS only (Render provides free SSL)
- ✅ Rotate API keys regularly
- ✅ Monitor deployment logs for errors
- ✅ Keep dependencies updated

## Rollback

If deployment fails:
1. Check logs in Render Dashboard
2. Fix the issue and push to GitHub
3. Render will automatically redeploy
4. Or manually click "Redeploy" in Dashboard

## Cost Considerations

- **Render**: Free tier available (12 hours/month), then $7+/month
- **MongoDB Atlas**: Free tier available (512 MB), then $0.10+/hour
- **Cloudinary**: Free tier available (5 GB/mo), then usage-based

For production use, budget approximately $20-50/month total.
