import {
  Ok,
  Err,
  isOk,
  match,
  map,
  and_then,
  unwrap_or,
  tryCatch,
  tryCatchAsync,
  when,
  _,
} from "../src/main";

// ─────────────────────────────────────────────
// Basic Result usage
// ─────────────────────────────────────────────

type User = { id: number; name: string };
type AppError = { code: string; message: string };

function fetchUser(id: number) {
  if (id <= 0) return Err<AppError>({ code: "INVALID_ID", message: "ID must be positive" });
  return Ok<User>({ id, name: "Bismarck" });
}

const user = fetchUser(1);

console.log("isOk:", isOk(user)); // true

const greeting = match(user, {
  Ok:  (u)  => `Hello, ${u.name}!`,
  Err: (e)  => `Error [${e.code}]: ${e.message}`,
});
console.log(greeting); // Hello, Bismarck!

// ─────────────────────────────────────────────
// Chaining
// ─────────────────────────────────────────────

type Profile = { bio: string };

function fetchProfile(userId: number) {
  if (userId === 1) return Ok<Profile>({ bio: "TypeScript enthusiast" });
  return Err<AppError>({ code: "NOT_FOUND", message: "Profile not found" });
}

const bio = and_then(fetchUser(1), (u) => fetchProfile(u.id));

console.log(
  match(bio, {
    Ok:  (p) => `Bio: ${p.bio}`,
    Err: (e) => `Error: ${e.message}`,
  }),
); // Bio: TypeScript enthusiast

// ─────────────────────────────────────────────
// map + unwrap_or
// ─────────────────────────────────────────────

const nameUpper = unwrap_or(
  map(fetchUser(1), (u) => u.name.toUpperCase()),
  "UNKNOWN",
);
console.log("Name:", nameUpper); // Name: BISMARCK

// ─────────────────────────────────────────────
// tryCatch — wrapping throwing code
// ─────────────────────────────────────────────

const parsed = tryCatch(
  () => JSON.parse('{"ok":true}') as unknown,
  (e) => ({ code: "PARSE_ERROR", message: String(e) }),
);
console.log("Parsed:", match(parsed, { Ok: (v) => v, Err: (e) => e }));

const broken = tryCatch(
  () => JSON.parse("not json"),
  (e) => ({ code: "PARSE_ERROR", message: String(e) }),
);
console.log("Broken:", match(broken, { Ok: (v) => v, Err: (e) => e.code }));

// ─────────────────────────────────────────────
// tryCatchAsync
// ─────────────────────────────────────────────

const fetched = await tryCatchAsync(
  () => Promise.resolve({ status: 200, data: "hello" }),
  (e) => ({ code: "FETCH_ERROR", message: String(e) }),
);
console.log("Async:", match(fetched, { Ok: (r) => r.data, Err: (e) => e.code }));

// ─────────────────────────────────────────────
// Universal match — primitives + when() + _
// ─────────────────────────────────────────────

const statusCode = 404;
const label = match(statusCode, {
  200: () => "OK",
  201: () => "Created",
  [when((n: number) => n >= 400 && n < 500)]: () => "Client Error",
  [when((n: number) => n >= 500)]:             () => "Server Error",
  [_]: () => "Unknown",
});
console.log("Status:", label); // Client Error

// ─────────────────────────────────────────────
// Discriminated union via kind
// ─────────────────────────────────────────────

type Shape =
  | { kind: "circle";    radius: number }
  | { kind: "rectangle"; w: number; h: number };

function area(shape: Shape) {
  return match(shape, {
    circle:    ({ radius }) => Math.PI * radius ** 2,
    rectangle: ({ w, h })  => w * h,
  });
}

console.log("Circle area:   ", area({ kind: "circle",    radius: 5 }).toFixed(2));
console.log("Rectangle area:", area({ kind: "rectangle", w: 4, h: 6 }));
