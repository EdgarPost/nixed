import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  external: ['react', '@tauri-apps/api'],
  sourcemap: true,
  clean: true,
});
