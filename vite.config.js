import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` (e.g., .env.development or .env.production)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      // If VITE_PORT is set in your .env file, use it. Otherwise default to 5173.
      port: Number(env.VITE_PORT) || 5173,
    },
  };
});
