# Analytics Integration Guide

## Overview

This implementation adds Yandex Metrika and Google Analytics (GA4) tracking to all pages of the OQTA application, with counter IDs stored securely in environment variables.

## How It Works

### Architecture

1. **Environment Variables**: Analytics IDs are stored in `.env` file
2. **API Endpoint**: `/api/analytics/config` serves the analytics configuration to the frontend
3. **Dynamic Loading**: JavaScript on each page fetches the config and initializes analytics trackers

### Implementation Details

- **Yandex Metrika**: Full implementation with clickmap, link tracking, accurate bounce tracking, and webvisor
- **Google Analytics**: GA4 implementation using gtag.js
- **Graceful Degradation**: If analytics IDs are not configured, the scripts gracefully skip initialization

## Configuration

### 1. Set Environment Variables

Add the following to your `.env` file:

```bash
# Analytics
YANDEX_METRIKA_ID=12345678
GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Replace the values with your actual:
- **YANDEX_METRIKA_ID**: Your Yandex Metrika counter ID (numbers only)
- **GA_MEASUREMENT_ID**: Your Google Analytics 4 Measurement ID (format: G-XXXXXXXXXX)

### 2. Deploy

The analytics will be automatically initialized on all pages once the environment variables are set and the application is deployed.

## Pages with Analytics

Analytics tracking is enabled on:
1. **Main Landing Page** (`index.html`)
2. **Admin Panel** (`admin/index.html`)
3. **Assets Page** (`assets/index.html`)

## Features

### Yandex Metrika Features
- Click map tracking
- Link tracking
- Accurate bounce tracking
- Webvisor (session recordings)
- Noscript fallback for users with JavaScript disabled

### Google Analytics Features
- GA4 tracking
- Page view tracking
- Event tracking (automatic)

## Testing

### Test the API Endpoint

```bash
curl http://localhost:3000/api/analytics/config
```

Expected response:
```json
{
  "yandexMetrikaId": "12345678",
  "gaMeasurementId": "G-TEST123456"
}
```

### Verify in Browser

1. Open the browser's Developer Console
2. Navigate to any page (e.g., http://localhost:3000/)
3. Check that:
   - No errors appear in the console
   - Yandex Metrika script is loaded (`ym` function is available)
   - Google Analytics script is loaded (`gtag` function is available)
   - Network requests to Yandex and Google analytics servers are visible

### Check in Analytics Dashboards

1. **Yandex Metrika**: Log into https://metrika.yandex.com/ and verify real-time visitors
2. **Google Analytics**: Log into https://analytics.google.com/ and check real-time reports

## Security Notes

- Analytics IDs are public by nature (visible in browser requests)
- They should still be stored in environment variables for easy configuration across environments
- No sensitive data should be sent to analytics trackers

## Troubleshooting

### Analytics not loading
- Check that environment variables are set correctly
- Verify the API endpoint returns valid IDs
- Check browser console for errors

### API endpoint returns empty strings
- Ensure `.env` file exists and contains the analytics variables
- Restart the server after updating `.env`

### Script conflicts
- If you see errors related to `ym` or `gtag`, check for duplicate analytics implementations
- Ensure no ad blockers are interfering with analytics scripts

## Example Environment Variables

See `.env.example` for the complete list of environment variables including analytics configuration:

```bash
# Analytics
YANDEX_METRIKA_ID="your-yandex-metrika-counter-id"
GA_MEASUREMENT_ID="G-XXXXXXXXXX"
```
