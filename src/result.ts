/**
 * @module result
 *
 * Rust-inspired `Result<T, E>` type for TypeScript.
 * Provides exhaustive error handling without exceptions.
 *
 * @example
 * ```ts
 * import { Ok, Err, match } from "@your-scope/result";
 *
 * function divide(a: number, b: number): Result<number, string> {
 *   if (b === 0) return Err("Division by zero");
 *   return Ok(a / b);
 * }
 *
 * const result = divide(10, 2);
 *
 * const msg = match(result, {
 *   Ok:  (value) => `Result: ${value}`,
 *   Err: (error) => `Error: ${error}`,
 * });
 * // → "Result: 5"
 * ```
 */

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

/**
 * Represents a successful result containing a value of type `T`.
 *
 * @template T - The type of the contained success value.
 *
 * @example
 * ```ts
 * const ok: Ok<number> = { _tag: "Ok", value: 42 };
 * ```
 */
export type Ok<T> = {
  readonly _tag: "Ok";
  readonly value: T;
};

/**
 * Represents a failed result containing an error of type `E`.
 *
 * @template E - The type of the contained error value.
 *
 * @example
 * ```ts
 * const err: Err<string> = { _tag: "Err", error: "Something went wrong" };
 * ```
 */
export type Err<E> = {
  readonly _tag: "Err";
  readonly error: E;
};

/**
 * A discriminated union representing either success (`Ok<T>`) or failure (`Err<E>`).
 *
 * Use {@link Ok} and {@link Err} constructors to create values,
 * and {@link match} for exhaustive pattern matching.
 *
 * @template T - The type of the success value.
 * @template E - The type of the error value.
 *
 * @example
 * ```ts
 * type AppError = { code: string; message: string };
 *
 * function fetchUser(id: number): Result<User, AppError> {
 *   if (id <= 0) return Err({ code: "INVALID_ID", message: "ID must be positive" });
 *   return Ok({ id, name: "Bismarck" });
 * }
 * ```
 */
export type Result<T, E> = Ok<T> | Err<E>;

// ─────────────────────────────────────────────
// Constructors
// ─────────────────────────────────────────────

/**
 * Creates a successful `Result` containing `value`.
 *
 * @template T - The type of the success value.
 * @param value - The success value to wrap.
 * @returns An `Ok<T>` result.
 *
 * @example
 * ```ts
 * const result = Ok(42);
 * // → { _tag: "Ok", value: 42 }
 *
 * const user = Ok({ id: 1, name: "Bismarck" });
 * // → Ok<{ id: number; name: string }>
 * ```
 */
export const Ok = <T>(value: T): Ok<T> => ({ _tag: "Ok", value });

/**
 * Creates a failed `Result` containing `error`.
 *
 * @template E - The type of the error value.
 * @param error - The error value to wrap.
 * @returns An `Err<E>` result.
 *
 * @example
 * ```ts
 * const result = Err("Not found");
 * // → { _tag: "Err", error: "Not found" }
 *
 * const err = Err({ code: "NOT_FOUND", status: 404 });
 * // → Err<{ code: string; status: number }>
 * ```
 */
export const Err = <E>(error: E): Err<E> => ({ _tag: "Err", error });

// ─────────────────────────────────────────────
// Type Guards
// ─────────────────────────────────────────────

/**
 * Narrows a `Result<T, E>` to `Ok<T>`.
 *
 * @template T - The type of the success value.
 * @template E - The type of the error value.
 * @param result - The result to check.
 * @returns `true` if the result is `Ok`, narrowing the type accordingly.
 *
 * @example
 * ```ts
 * const result = fetchUser(1);
 *
 * if (isOk(result)) {
 *   console.log(result.value.name); // TypeScript knows value: User
 * }
 * ```
 */
export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> =>
  result._tag === "Ok";

/**
 * Narrows a `Result<T, E>` to `Err<E>`.
 *
 * @template T - The type of the success value.
 * @template E - The type of the error value.
 * @param result - The result to check.
 * @returns `true` if the result is `Err`, narrowing the type accordingly.
 *
 * @example
 * ```ts
 * const result = fetchUser(-1);
 *
 * if (isErr(result)) {
 *   console.log(result.error.code); // TypeScript knows error: AppError
 * }
 * ```
 */
export const isErr = <T, E>(result: Result<T, E>): result is Err<E> =>
  result._tag === "Err";

// ─────────────────────────────────────────────
// Unwrapping
// ─────────────────────────────────────────────

/**
 * Returns the contained `Ok` value.
 *
 * **Throws** if the result is `Err`.
 * Only use when you are certain the result cannot be `Err`,
 * or intentionally want a hard failure.
 *
 * @template T - The type of the success value.
 * @template E - The type of the error value.
 * @param result - The result to unwrap.
 * @param msg - Optional custom error message thrown on `Err`.
 * @returns The contained success value.
 * @throws {Error} If the result is `Err`.
 *
 * @example
 * ```ts
 * const user = unwrap(fetchUser(1));
 * // → User (or throws if Err)
 *
 * // With a custom message
 * const user = unwrap(fetchUser(1), "Expected user to exist");
 *
 * // ⚠️ Only use when Err is truly impossible
 * const config = unwrap(loadConfig(), "Config must be valid at startup");
 * ```
 */
export const unwrap = <T, E>(result: Result<T, E>, msg?: string): T => {
  if (isOk(result)) return result.value;
  throw new Error(msg ?? `Called unwrap() on an Err value: ${String(result.error)}`);
};

/**
 * Returns the contained `Ok` value, or `defaultValue` if `Err`.
 *
 * The default is always evaluated eagerly — if computing it is expensive,
 * use {@link unwrap_or_else} instead.
 *
 * @template T - The type of the success value.
 * @template E - The type of the error value.
 * @param result - The result to unwrap.
 * @param defaultValue - The fallback value returned on `Err`.
 * @returns The success value or the provided default.
 *
 * @example
 * ```ts
 * const user = unwrap_or(fetchUser(-1), { id: 0, name: "Guest" });
 * // → { id: 0, name: "Guest" } when Err
 *
 * const count = unwrap_or(parseCount("abc"), 0);
 * // → 0
 * ```
 */
export const unwrap_or = <T, E>(result: Result<T, E>, defaultValue: T): T =>
  isOk(result) ? result.value : defaultValue;

/**
 * Returns the contained `Ok` value, or computes a fallback from the error via `fn`.
 *
 * Prefer this over {@link unwrap_or} when the default value is expensive to compute
 * or depends on the error itself.
 *
 * @template T - The type of the success value.
 * @template E - The type of the error value.
 * @param result - The result to unwrap.
 * @param fn - A function that receives the error and returns a fallback value.
 * @returns The success value or the computed fallback.
 *
 * @example
 * ```ts
 * // Fallback that depends on error content
 * const user = unwrap_or_else(fetchUser(-1), (error) => ({
 *   id: -1,
 *   name: `Unknown (${error.code})`,
 * }));
 *
 * // Lazy expensive default
 * const data = unwrap_or_else(result, (_) => computeExpensiveDefault());
 * ```
 */
export const unwrap_or_else = <T, E>(
  result: Result<T, E>,
  fn: (error: E) => T,
): T => (isOk(result) ? result.value : fn(result.error));

// ─────────────────────────────────────────────
// Transforming
// ─────────────────────────────────────────────

/**
 * Transforms the `Ok` value with `fn`, leaving `Err` unchanged.
 *
 * Equivalent to Rust's `Result::map`.
 *
 * @template T - The type of the input success value.
 * @template E - The type of the error value.
 * @template U - The type of the output success value.
 * @param result - The result to transform.
 * @param fn - A function applied to the `Ok` value.
 * @returns A new `Result` with the transformed value, or the original `Err`.
 *
 * @example
 * ```ts
 * // Extract a field
 * const nameResult = map(fetchUser(1), (user) => user.name);
 * // Ok<User> → Ok<string>
 *
 * // Err passes through untouched
 * const doubled = map(Ok(21), (n) => n * 2);     // → Ok(42)
 * const failed  = map(Err("oops"), (n) => n * 2); // → Err("oops")
 * ```
 */
export const map = <T, E, U>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> => (isOk(result) ? Ok(fn(result.value)) : result);

/**
 * Transforms the `Err` value with `fn`, leaving `Ok` unchanged.
 *
 * Useful for normalising errors from different sources into a unified type.
 * Equivalent to Rust's `Result::map_err`.
 *
 * @template T - The type of the success value.
 * @template E - The type of the input error value.
 * @template F - The type of the output error value.
 * @param result - The result to transform.
 * @param fn - A function applied to the `Err` value.
 * @returns The original `Ok`, or a new `Err` with the transformed error.
 *
 * @example
 * ```ts
 * // Normalise a raw error into AppError
 * const result = map_err(
 *   parseRawResponse(data),
 *   (raw) => ({ code: "PARSE_ERROR", message: String(raw) })
 * );
 *
 * // Add metadata to an existing error
 * const withMeta = map_err(result, (e) => ({ ...e, handled: true }));
 * ```
 */
export const map_err = <T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F,
): Result<T, F> => (isErr(result) ? Err(fn(result.error)) : result);

// ─────────────────────────────────────────────
// Chaining
// ─────────────────────────────────────────────

/**
 * Chains a `Result`-returning operation on the `Ok` value.
 * Short-circuits on `Err` without calling `fn`.
 *
 * Use this to sequence operations where each step can fail.
 * Equivalent to Rust's `Result::and_then` / monadic `flatMap`.
 *
 * @template T - The type of the input success value.
 * @template E - The type of the error value.
 * @template U - The type of the output success value.
 * @param result - The result to chain from.
 * @param fn - A function that receives the `Ok` value and returns a new `Result`.
 * @returns The result of `fn`, or the original `Err`.
 *
 * @example
 * ```ts
 * // Sequential operations where any step can fail
 * const bioResult = and_then(
 *   fetchUser(1),                    // Result<User, AppError>
 *   (user) => fetchProfile(user.id)  // Result<Profile, AppError>
 * );
 * // → Ok<Profile> or the first Err encountered
 *
 * // Validate after parsing
 * const result = and_then(
 *   parseId(raw),         // string → Result<number, E>
 *   (id) => fetchUser(id) // number → Result<User, E>
 * );
 * ```
 */
export const and_then = <T, E, U>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> => (isOk(result) ? fn(result.value) : result);

/**
 * Recovers from an `Err` by calling `fn` with the error to produce a new `Result`.
 * If the result is `Ok`, it is returned unchanged.
 *
 * Equivalent to Rust's `Result::or_else`.
 *
 * @template T - The type of the success value.
 * @template E - The type of the input error value.
 * @template F - The type of the output error value.
 * @param result - The result to recover from.
 * @param fn - A function that receives the error and returns a new `Result`.
 * @returns The original `Ok`, or the result of the recovery function.
 *
 * @example
 * ```ts
 * // Try a fallback source on failure
 * const user = or_else(
 *   fetchFromPrimary(id),
 *   (_error) => fetchFromCache(id)
 * );
 *
 * // Conditionally recover
 * const result = or_else(
 *   riskyOperation(),
 *   (e) => e.recoverable ? Ok(defaultValue) : Err(normalise(e))
 * );
 * ```
 */
export const or_else = <T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => Result<T, F>,
): Result<T, F> => (isOk(result) ? result : fn(result.error));

// ─────────────────────────────────────────────
// Conversion
// ─────────────────────────────────────────────

/**
 * Converts a `Result<T, E>` to `T | null`.
 *
 * Useful for integrating with legacy code or optional chaining patterns.
 *
 * @template T - The type of the success value.
 * @template E - The type of the error value.
 * @param result - The result to convert.
 * @returns The success value, or `null` if `Err`.
 *
 * @example
 * ```ts
 * const user = ok_or_null(fetchUser(1));
 * // → User | null
 *
 * // Pairs naturally with optional chaining
 * const name = ok_or_null(fetchUser(1))?.name ?? "Guest";
 * ```
 */
export const ok_or_null = <T, E>(result: Result<T, E>): T | null =>
  isOk(result) ? result.value : null;

// ─────────────────────────────────────────────
// Interop
// ─────────────────────────────────────────────

/**
 * Wraps a throwing synchronous function into a `Result`.
 *
 * Use to integrate throwing legacy code, `JSON.parse`, or any
 * function that may throw into the `Result` workflow.
 *
 * @template T - The return type of the wrapped function.
 * @template E - The error type produced by `onError`.
 * @param fn - A function that may throw.
 * @param onError - Maps the caught exception to a typed error `E`.
 * @returns `Ok<T>` if `fn` succeeds, `Err<E>` if it throws.
 *
 * @example
 * ```ts
 * // Wrapping JSON.parse
 * const result = tryCatch(
 *   () => JSON.parse(rawJson) as unknown,
 *   (e) => ({ code: "PARSE_ERROR", message: String(e) })
 * );
 *
 * // Wrapping a throwing SDK call
 * const result = tryCatch(
 *   () => sdkClient.getUser(id),
 *   (e) => toAppError(e)
 * );
 * ```
 */
export const tryCatch = <T, E>(
  fn: () => T,
  onError: (error: unknown) => E,
): Result<T, E> => {
  try {
    return Ok(fn());
  } catch (e) {
    return Err(onError(e));
  }
};

/**
 * Wraps a throwing async function into a `Promise<Result<T, E>>`.
 *
 * The returned promise always resolves — it never rejects.
 * Use to eliminate `try/catch` blocks in async code.
 *
 * @template T - The resolved type of the wrapped promise.
 * @template E - The error type produced by `onError`.
 * @param fn - An async function that may throw or reject.
 * @param onError - Maps the caught exception to a typed error `E`.
 * @returns A promise resolving to `Ok<T>` on success or `Err<E>` on failure.
 *
 * @example
 * ```ts
 * // Fetch without try/catch
 * const result = await tryCatchAsync(
 *   () => fetch("/api/users/1").then((r) => r.json()),
 *   (e) => ({ code: "NETWORK_ERROR", message: String(e) })
 * );
 *
 * match(result, {
 *   Ok:  (data)  => console.log(data),
 *   Err: (error) => console.error(error.code),
 * });
 *
 * // In an RTK Query baseQuery
 * const baseQuery = async (url: string) =>
 *   tryCatchAsync(
 *     () => fetch(url).then((r) => r.json()),
 *     (e) => ({ code: "FETCH_FAILED", message: String(e) })
 *   );
 * ```
 */
export const tryCatchAsync = async <T, E>(
  fn: () => Promise<T>,
  onError: (error: unknown) => E,
): Promise<Result<T, E>> => {
  try {
    return Ok(await fn());
  } catch (e) {
    return Err(onError(e));
  }
};
