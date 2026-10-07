import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
await mkdir("dist", { recursive: true });
await build({
  entryPoints: ["src/main.tsx", "src/grid.worker.ts"],
  bundle: true,
  format: "esm",
  target: "es2022",
  outdir: "dist",
  minify: true,
  jsx: "automatic",
});
await writeFile(
  "dist/index.html",
  (await readFile("index.html", "utf8"))
    .replace('src="/src/main.tsx"', 'src="./main.js"')
    .replace("</head>", '<link rel="stylesheet" href="./main.css"></head>'),
);
console.log("Built React UI, CSS and independent Worker into dist/");
