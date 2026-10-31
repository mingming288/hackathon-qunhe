import { defineConfig } from "vite";
import { originalGamesPlugin } from "./build/original-games-plugin.js";

export default defineConfig({ plugins: [originalGamesPlugin()] });
