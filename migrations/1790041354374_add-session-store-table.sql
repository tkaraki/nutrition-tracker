-- Up Migration
-- Session store for connect-pg-simple (src/lib/session.ts). Schema matches
-- the library's own canonical table definition exactly. Created here via
-- migration, like every other table in this project, rather than left to
-- the library's createTableIfMissing — one thing managing schema, not two.

CREATE TABLE "session" (
  "sid"    VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
  "sess"   JSON NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL
);

CREATE INDEX "IDX_session_expire" ON "session" ("expire");

-- Down Migration

DROP TABLE IF EXISTS "session";
