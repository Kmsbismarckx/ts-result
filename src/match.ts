/**
 * @module match
 *
 * Universal pattern matching for TypeScript, inspired by Rust's `match` expression.
 *
 * Supports:
 * - Literal values (string, number, boolean)
 * - Discriminated unions (via `_tag`, `type`, `kind`, or any custom field)
 * - Type guard patterns (`when`)
 * - Wildcard fallback (`_`)
 * - Guard conditions (`if`)
 * - Result<T, E> matching
 *
 * @example
 * ```ts
 * const msg = match("hello", {
 *   hello: () => "Hi there!",
 *   bye:   () => "Goodbye!",
 *   _:     (v) => `Unknown: ${v}`,
 * });
 * ```
 */

import type { Result } from "./result";

// ─────────────────────────────────────────────
// Core types
// ─────────────────────────────────────────────

/** Wildcard — catches anything not matched above */
const _ = Symbol("_");
export { _ };
export type Wildcard = typeof _;

/**
 * A match arm: either a handler function or a nested sub-pattern.
 */
type Arm<TIn, TOut> = (value: TIn) => TOut;

// ─────────────────────────────────────────────
// match() — universal
// ─────────────────────────────────────────────

/**
 * Universal pattern matching over any value.
 *
 * Arms are checked top-to-bottom. The first matching arm wins.
 * Use `_` (wildcard) as the last arm to handle all remaining cases.
 *
 * Arm types:
 * - **Literal key** — matches primitive values directly (`"ok"`, `404`, `true`)
 * - **`when(guard, handler)`** — matches if guard returns true
 * - **`_` (wildcard)** — catches anything not matched above
 *
 * @param value - The value to match against.
 * @param arms  - A record of pattern arms.
 * @returns The result of the first matching arm.
 * @throws {Error} If no arm matches and no wildcard `_` is provided.
 *
 * @example
 * ```ts
 * // ── Primitives ───────────────────────────
 * const label = match(statusCode, {
 *   200: () => "OK",
 *   404: () => "Not Found",
 *   500: () => "Server Error",
 *   _:   (n) => `Unknown: ${n}`,
 * });
 *
 * // ── Discriminated union ──────────────────
 * type Shape =
 *   | { kind: "circle";    radius: number }
 *   | { kind: "rectangle"; w: number; h: number }
 *   | { kind: "triangle";  base: number; height: number };
 *
 * const area = match(shape, {
 *   circle:    ({ radius }) => Math.PI * radius ** 2,
 *   rectangle: ({ w, h })   => w * h,
 *   triangle:  ({ base, height }) => (base * height) / 2,
 * });
 *
 * // ── Guard conditions ─────────────────────
 * const category = match(score, {
 *   [when((n) => n >= 90)]: () => "A",
 *   [when((n) => n >= 75)]: () => "B",
 *   [when((n) => n >= 60)]: () => "C",
 *   _: () => "F",
 * });
 *
 * // ── Result<T, E> ─────────────────────────
 * const msg = match(fetchUser(1), {
 *   Ok:  (user)  => `Hello, ${user.name}`,
 *   Err: (error) => `Error: ${error.code}`,
 * });
 * ```
 */

/**
 * Overload 1 — `Result<T, E>`.
 *
 * When the value is a `Result`, TypeScript infers `T` and `E` precisely —
 * no casting needed inside the `Ok` and `Err` handlers.
 *
 * @example
 * ```ts
 * const result = fetchUser(1); // Result<User, AppError>
 *
 * const name = match(result, {
 *   Ok:  (user)  => user.name,   // user:  User     ✓
 *   Err: (error) => error.code,  // error: AppError ✓
 * });
 * ```
 */
export function match<T, E, R>(
  value: Result<T, E>,
  arms: { Ok: (value: T) => R; Err: (error: E) => R },
): R;

/**
 * Overload 2 — discriminated unions, primitives, `when()` guards.
 *
 * @example
 * ```ts
 * match(shape,  { circle: ..., rectangle: ... });
 * match(status, { 200: ..., 404: ..., _: (n) => `Unknown: ${n}` });
 * match(score,  { [when(n => n > 90)]: () => "A", _: () => "F" });
 * ```
 */
export function match<TIn, TOut>(value: TIn, arms: MatchArms<TIn, TOut>): TOut;

/** @internal Implementation — not part of the public API surface */
export function match<TIn, TOut>(
  value: TIn,
  arms: MatchArms<TIn, TOut>,
): TOut {
  // 1. Discriminated union: _tag / kind / type / status fields
  const discriminantFields = ["_tag", "kind", "type", "status", "variant"] as const;

  if (value !== null && typeof value === "object") {
    for (const field of discriminantFields) {
      const tag = (value as Record<string, unknown>)[field];
      if (typeof tag === "string" && tag in arms) {
        const arm = (arms as Record<string, unknown>)[tag];
        // Unwrap Result<T, E>: Ok handlers receive T, Err handlers receive E
        if (tag === "Ok" && "value" in (value as object)) {
          return resolveArm(arm, (value as unknown as { value: unknown }).value);
        }
        if (tag === "Err" && "error" in (value as object)) {
          return resolveArm(arm, (value as unknown as { error: unknown }).error);
        }
        return resolveArm(arm, value);
      }
    }
  }

  // 2. Primitive literal match
  if (value !== null && typeof value !== "object" && typeof value !== "function") {
    const key = String(value);
    if (key in arms) {
      const arm = (arms as Record<string, unknown>)[key];
      return resolveArm(arm, value);
    }
  }

  // 3. when() guards — checked in insertion order
  for (const [key, arm] of Object.entries(arms)) {
    const guard = guardRegistry.get(key);
    if (guard && guard(value)) {
      return resolveArm(arm, value);
    }
  }

  // 4. Wildcard _
  if (_ in arms) {
    const arm = (arms as Record<symbol, unknown>)[_];
    return resolveArm(arm, value);
  }

  throw new Error(
    `match(): no arm matched value: ${JSON.stringify(value)}`,
  );
}

// ─────────────────────────────────────────────
// when() — guard factory
// ─────────────────────────────────────────────

/** Registry mapping when()-generated keys → their guard functions */
const guardRegistry = new Map<string, (value: unknown) => boolean>();

/**
 * Creates a guard arm for `match()`.
 * The arm fires when the predicate returns `true`.
 *
 * @param predicate - A function that tests the value.
 * @returns A unique key to use as an arm in `match()`.
 *
 * @example
 * ```ts
 * const category = match(score, {
 *   [when((n: number) => n >= 90)]: () => "A",
 *   [when((n: number) => n >= 75)]: () => "B",
 *   [when((n: number) => n >= 60)]: () => "C",
 *   _: () => "F",
 * });
 *
 * // Type narrowing with instanceof
 * const message = match(error, {
 *   [when((e): e is TypeError    => e instanceof TypeError)]:    () => "Type error",
 *   [when((e): e is RangeError   => e instanceof RangeError)]:   () => "Range error",
 *   _: (e) => `Unknown: ${e.message}`,
 * });
 * ```
 */
export function when<T>(predicate: (value: T) => boolean): string {
  const key = `__when__${guardRegistry.size}__`;
  guardRegistry.set(key, predicate as (value: unknown) => boolean);
  return key;
}

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

type MatchArms<TIn, TOut> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: Arm<any, TOut>;
  [_]?: Arm<TIn, TOut>;
};

function resolveArm<TIn, TOut>(arm: unknown, value: TIn): TOut {
  if (typeof arm === "function") {
    return (arm as Arm<TIn, TOut>)(value);
  }
  throw new Error(`match(): arm must be a function, got: ${typeof arm}`);
}
