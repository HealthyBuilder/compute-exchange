import { drizzle, type AnyD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

/**
 * The demo's live issuance runs in Node, while an optional D1 adapter remains
 * available for a future Worker deployment. The caller supplies the binding so
 * this shared module does not import a Worker-only runtime module.
 */
export function getDb(database?: AnyD1Database) {
  if (!database) {
    throw new Error(
      "A D1 database binding is required before using the optional database adapter."
    );
  }

  return drizzle(database, { schema });
}
