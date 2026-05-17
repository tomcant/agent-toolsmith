// `bun build --compile` directly doesn't work because Ink's reconciler
// dynamically imports `./devtools.js` (gated on `process.env.DEV === 'true'`),
// and that file has a static `import devtools from 'react-devtools-core'`. Bun's
// bundler eagerly follows dynamic imports into the bundle graph, so the
// unresolved `react-devtools-core` fails the build even though the branch is
// dead in prod. `--external` would fix it for normal bundling but not for
// `--compile` (compiled binaries have no node_modules at runtime).
//
// Fix: stub `react-devtools-core` to an empty module so the eager resolve
// succeeds. The stub is never reached at runtime as long as `DEV` is unset.
await Bun.build({
  entrypoints: ["./src/index.ts"],
  compile: { outfile: "agent" },
  plugins: [
    {
      name: "stub-react-devtools-core",
      setup(builder) {
        builder.onResolve({ filter: /^react-devtools-core$/ }, () => ({
          path: "react-devtools-core",
          namespace: "stub",
        }));
        builder.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
          contents: "export default {}",
          loader: "js",
        }));
      },
    },
  ],
});
