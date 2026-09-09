import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins:[react()], base:'./', build:{ outDir:process.env.APPDEPLOY_VITE_OUT_DIR || 'dist', sourcemap:false }, server:{ proxy:{ '/api':{ target:process.env.API_PROXY || 'http://localhost:3000', changeOrigin:true } } } });
