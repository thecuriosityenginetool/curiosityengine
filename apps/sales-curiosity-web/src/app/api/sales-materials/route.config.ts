export const config = {
  api: {
    bodyParser: false, // Disable default parser, we handle it in the route
  },
};

// Vercel serverless function timeout
// Free tier: 10 seconds, Pro: 60 seconds
export const maxDuration = 60; // Max execution time in seconds

// Vercel body size limit (4.5MB on free tier)
export const bodyParser = {
  sizeLimit: '4.5mb',
};
