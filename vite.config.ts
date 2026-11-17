import react from '@vitejs/plugin-react';

const config: Record<string, unknown> = {
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
};

export default config;
