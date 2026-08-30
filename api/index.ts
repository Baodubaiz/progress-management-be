// Vercel serverless entry point
// This file exports the Express app for Vercel's @vercel/node handler
// Local dev still uses src/server.ts (with app.listen)

import app from '../src/app';

export default app;
