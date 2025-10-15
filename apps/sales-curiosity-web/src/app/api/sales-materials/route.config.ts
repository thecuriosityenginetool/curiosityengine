export const config = {
  api: {
    bodyParser: false, // Disable default parser, we handle it in the route
  },
};

// Vercel has a 4.5MB request body limit on free tier
// For larger files, users need to compress or split them
export const maxDuration = 60; // Max execution time in seconds
