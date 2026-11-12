// typescript-eslint cannot use the TypeScript 7 (native) package yet, so it is pointed at the side-by-side
// TypeScript 6 API package for the lint run only. tsc/vite keep using TypeScript 7.
// Remove this once typescript-eslint supports TS >= 7.1 (typescript-eslint/typescript-eslint#10940).
const Module = require("node:module");
const orig = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === "typescript") request = "@typescript/typescript6";
  return orig.call(this, request, ...rest);
};
