# Ticket: TypeScript Compilation Strategy

**Labels**: `wayfinder:grilling`
**Status**: closed
**Resolution**: grilling
**Blocked by**: none

## Question

How should Shrty handle TypeScript compilation for development and production?

## Resolution

**tsx for development, tsc for production.**

- **Development**: `tsx watch packages/api/src/index.ts` — instant startup, watch mode, handles raw TypeScript from `@shrty/shared` natively. No compilation step needed.
- **Production**: `tsc -p packages/api/tsconfig.json` — compiles to `packages/api/dist/`. TypeScript imports from `@shrty/shared` are type-only and erase at compilation. Output is plain ESM JavaScript.
- **Docker**: Multi-stage build copies only `packages/api/dist/` and `node_modules/`. No `tsx`, `typescript`, or dev dependencies in the production image.
- **Frontend**: Vite handles TypeScript natively (esbuild transform). No separate compilation needed — `vite build` produces the production bundle.

**Why not Bun**: TRD locked Node.js 20. Changing runtime affects every dependency, Docker base image, and deployment assumption. Not worth it for v1.

**Why not tsup**: Bundling solves a problem this project doesn't have. The backend is a server, not a browser bundle. File-by-file compilation is simpler and avoids native module edge cases.

**Why not Node --loader**: Experimental, version-dependent, slower than alternatives. Not production-ready.

**Shared types package**: `@shrty/shared` exports raw TypeScript (`main: ./src/index.ts`). In development, `tsx` handles this natively. In production, `tsc` compiles the api package and type-only imports erase. No build step needed for the shared package itself.
