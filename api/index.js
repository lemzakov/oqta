// Vercel serverless function handler
import app from '../dist/server.js';

export default async (req, res) => {
  // Handle the request with Express app
  return app(req, res);
};
