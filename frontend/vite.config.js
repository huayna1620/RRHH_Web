import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
export default defineConfig({
    plugins: [react()],
    server: {
        host: "0.0.0.0",
        allowedHosts: [".trycloudflare.com"]
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src")
        }
    }
});
