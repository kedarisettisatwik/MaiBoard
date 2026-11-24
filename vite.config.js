import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({mode,command})=>{
  const env=loadEnv(mode,process.cwd(),'');
  if(command==='build'){
    const required=['API_KEY','AUTH_DOMAIN','PROJECT_ID','STORAGE_BUCKET','MESSAGING_SENDER_ID','APP_ID'].map(s=>'VITE_FIREBASE_'+s);
    const missing=required.filter(key=>!env[key]?.trim());
    if(missing.length)throw Error('Missing Firebase environment variables: '+missing.join(', '));
  }
  return {
  base: process.env.GITHUB_PAGES==='true'?'/MaiBoard/':'/',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: [
            "firebase/app",
            "firebase/auth",
            "firebase/firestore",
            "firebase/storage",
          ],
          editor: [
            "@tiptap/react",
            "@tiptap/starter-kit",
            "@tiptap/extension-text-style",
            "@tiptap/extension-highlight",
          ],
        },
      },
    },
  },
};});
