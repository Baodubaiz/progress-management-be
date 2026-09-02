import type { Application } from 'express';

export const setupSwagger = (_app: Application): void => {
  // Swagger is intentionally disabled to keep the backend portable and avoid
  // dependency issues during deployment on Render/Vercel.
};

export default setupSwagger;

