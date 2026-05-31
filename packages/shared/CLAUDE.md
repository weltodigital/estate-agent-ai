# @app/shared — Shared types, schemas, constants
Supplements root CLAUDE.md.

- `src/schemas/` — Zod schemas. One file per resource (`property.ts`, `photo.ts`, `floor-plan.ts`, etc.). Export both the Zod schema and the inferred TS type.
- `src/types/` — derived types and enums that don't have a Zod schema.
- `src/constants.ts` — shared constants (tone options, room types, staging styles, UK property type list).
- No runtime dependencies on Node-only or browser-only APIs. This package must be isomorphic.
