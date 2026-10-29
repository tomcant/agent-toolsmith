await Bun.build({
  entrypoints: ["./src/index.ts"],
  // Bundle only the native library selected for this build.
  define: { "process.env.OPENTUI_LIBC": JSON.stringify(process.env.OPENTUI_LIBC ?? "glibc") },
  compile: { outfile: "toolsmith" },
});
