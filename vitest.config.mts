import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// server/ のロジックと純粋関数の単体テスト用。コンポーネントのテストはしないため、Node 環境で動かす
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
  },
});
