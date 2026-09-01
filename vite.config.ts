import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// singlefile inlines all JS/CSS into dist/index.html so the build can be
// published as a self-contained page as well as served statically.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
})
