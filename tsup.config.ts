import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/main.ts"],
  format: ["esm", "cjs"], // dual output
  dts: true, // генерирует .d.ts
  sourcemap: true,
  clean: true, // чистит dist перед билдом
  splitting: false, // для библиотек обычно не нужно
  treeshake: true,
});
