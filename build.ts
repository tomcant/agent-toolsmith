await Bun.build({
  entrypoints: ["./src/index.ts"],
  compile: { outfile: "toolsmith" },
});
