import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: 'http://localhost:3000/api/docs-json',
  output: 'src/gen',
  plugins: [
    '@hey-api/client-axios',
    '@tanstack/react-query',
  ],
});
