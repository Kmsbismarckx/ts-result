import { describe, it, expect } from "vitest";
import {
  Ok,
  Err,
  isOk,
  isErr,
  unwrap,
  unwrap_or,
  unwrap_or_else,
  map,
  map_err,
  and_then,
  or_else,
  ok_or_null,
  tryCatch,
  tryCatchAsync,
} from "./result";

// ─────────────────────────────────────────────
// Constructors
// ─────────────────────────────────────────────

describe("Ok", () => {
  it("creates a successful result tagged with Ok", () => {
    // Arrange & Act
    const result = Ok(42);

    // Assert
    expect(result._tag).toBe("Ok");
  });

  it("preserves the wrapped value", () => {
    // Arrange & Act
    const result = Ok({ id: 1, name: "Bismarck" });

    // Assert
    expect(result.value).toEqual({ id: 1, name: "Bismarck" });
  });
});

describe("Err", () => {
  it("creates a failed result tagged with Err", () => {
    // Arrange & Act
    const result = Err("not found");

    // Assert
    expect(result._tag).toBe("Err");
  });

  it("preserves the wrapped error", () => {
    // Arrange & Act
    const result = Err({ code: 404, message: "not found" });

    // Assert
    expect(result.error).toEqual({ code: 404, message: "not found" });
  });
});

// ─────────────────────────────────────────────
// Type Guards
// ─────────────────────────────────────────────

describe("isOk", () => {
  it("returns true for an Ok result", () => {
    expect(isOk(Ok(1))).toBe(true);
  });

  it("returns false for an Err result", () => {
    expect(isOk(Err("fail"))).toBe(false);
  });
});

describe("isErr", () => {
  it("returns true for an Err result", () => {
    expect(isErr(Err("fail"))).toBe(true);
  });

  it("returns false for an Ok result", () => {
    expect(isErr(Ok(1))).toBe(false);
  });
});

// ─────────────────────────────────────────────
// Unwrapping
// ─────────────────────────────────────────────

describe("unwrap", () => {
  it("returns the value when result is Ok", () => {
    // Arrange
    const result = Ok(99);

    // Act
    const value = unwrap(result);

    // Assert
    expect(value).toBe(99);
  });

  it("throws with a default message when result is Err", () => {
    // Arrange
    const result = Err("something went wrong");

    // Act & Assert
    expect(() => unwrap(result)).toThrow("Called unwrap() on an Err value");
  });

  it("throws with a custom message when one is provided", () => {
    // Arrange
    const result = Err("internal");

    // Act & Assert
    expect(() => unwrap(result, "custom message")).toThrow("custom message");
  });
});

describe("unwrap_or", () => {
  it("returns the Ok value when result is Ok", () => {
    expect(unwrap_or(Ok(10), 0)).toBe(10);
  });

  it("returns the default value when result is Err", () => {
    expect(unwrap_or(Err("fail"), 0)).toBe(0);
  });
});

describe("unwrap_or_else", () => {
  it("returns the Ok value without calling the fallback", () => {
    // Arrange
    const fallback = (e: string) => e.length;

    // Act
    const value = unwrap_or_else(Ok(42), fallback);

    // Assert
    expect(value).toBe(42);
  });

  it("calls the fallback with the error when result is Err", () => {
    // Arrange
    const result = Err("oops");

    // Act
    const value = unwrap_or_else(result, (e) => e.toUpperCase());

    // Assert
    expect(value).toBe("OOPS");
  });
});

// ─────────────────────────────────────────────
// Transforming
// ─────────────────────────────────────────────

describe("map", () => {
  it("transforms the Ok value with the given function", () => {
    // Arrange
    const result = Ok(5);

    // Act
    const doubled = map(result, (n) => n * 2);

    // Assert
    expect(doubled).toEqual(Ok(10));
  });

  it("passes an Err result through without calling the function", () => {
    // Arrange
    const result = Err<string>("error");

    // Act
    const mapped = map(result, (n: number) => n * 2);

    // Assert
    expect(mapped).toEqual(Err("error"));
  });
});

describe("map_err", () => {
  it("transforms the Err value with the given function", () => {
    // Arrange
    const result = Err(404);

    // Act
    const mapped = map_err(result, (code) => `HTTP ${code}`);

    // Assert
    expect(mapped).toEqual(Err("HTTP 404"));
  });

  it("passes an Ok result through without calling the function", () => {
    // Arrange
    const result = Ok<number>(1);

    // Act
    const mapped = map_err(result, (code) => `HTTP ${code}`);

    // Assert
    expect(mapped).toEqual(Ok(1));
  });
});

// ─────────────────────────────────────────────
// Chaining
// ─────────────────────────────────────────────

describe("and_then", () => {
  it("applies the function when result is Ok, returning its Result", () => {
    // Arrange
    const safeSqrt = (n: number) =>
      n >= 0 ? Ok(Math.sqrt(n)) : Err("negative");

    // Act
    const result = and_then(Ok(9), safeSqrt);

    // Assert
    expect(result).toEqual(Ok(3));
  });

  it("short-circuits and returns the original Err without calling the function", () => {
    // Arrange
    const result = Err<string>("already failed");

    // Act
    const chained = and_then(result, (n: number) => Ok(n * 2));

    // Assert
    expect(chained).toEqual(Err("already failed"));
  });

  it("propagates a new Err produced by the chained function", () => {
    // Arrange
    const safeSqrt = (n: number) =>
      n >= 0 ? Ok(Math.sqrt(n)) : Err("negative");

    // Act
    const result = and_then(Ok(-4), safeSqrt);

    // Assert
    expect(result).toEqual(Err("negative"));
  });
});

describe("or_else", () => {
  it("passes an Ok result through without calling the recovery function", () => {
    // Arrange
    const result = Ok<number>(1);

    // Act
    const recovered = or_else(result, () => Ok(0));

    // Assert
    expect(recovered).toEqual(Ok(1));
  });

  it("calls the recovery function when result is Err", () => {
    // Arrange
    const result = Err< string>("not found");

    // Act
    const recovered = or_else(result, () => Ok(0));

    // Assert
    expect(recovered).toEqual(Ok(0));
  });

  it("allows the recovery function to return a new Err", () => {
    // Arrange
    const result = Err< string>("transient");

    // Act
    const recovered = or_else(result, (e) => Err(`permanent: ${e}`));

    // Assert
    expect(recovered).toEqual(Err("permanent: transient"));
  });
});

// ─────────────────────────────────────────────
// Conversion
// ─────────────────────────────────────────────

describe("ok_or_null", () => {
  it("returns the value when result is Ok", () => {
    expect(ok_or_null(Ok("hello"))).toBe("hello");
  });

  it("returns null when result is Err", () => {
    expect(ok_or_null(Err("fail"))).toBeNull();
  });
});

// ─────────────────────────────────────────────
// Interop
// ─────────────────────────────────────────────

describe("tryCatch", () => {
  it("returns Ok with the return value when the function succeeds", () => {
    // Arrange & Act
    const result = tryCatch(
      () => JSON.parse('{"ok":true}') as unknown,
      () => "parse error",
    );

    // Assert
    expect(result).toEqual(Ok({ ok: true }));
  });

  it("returns Err produced by onError when the function throws", () => {
    // Arrange & Act
    const result = tryCatch(
      () => JSON.parse("invalid json"),
      (e) => `caught: ${String(e)}`,
    );

    // Assert
    expect(isErr(result)).toBe(true);
    expect((result as ReturnType<typeof Err<string>>).error).toMatch(/caught:/);
  });
});

describe("tryCatchAsync", () => {
  it("returns Ok with the resolved value when the promise resolves", async () => {
    // Arrange & Act
    const result = await tryCatchAsync(
      () => Promise.resolve(42),
      () => "error",
    );

    // Assert
    expect(result).toEqual(Ok(42));
  });

  it("returns Err produced by onError when the promise rejects", async () => {
    // Arrange & Act
    const result = await tryCatchAsync(
      () => Promise.reject(new Error("network failure")),
      (e) => (e as Error).message,
    );

    // Assert
    expect(result).toEqual(Err("network failure"));
  });

  it("always resolves the outer promise, never rejects it", async () => {
    // Arrange & Act & Assert — should not throw
    await expect(
      tryCatchAsync(
        () => Promise.reject(new Error("boom")),
        () => "handled",
      ),
    ).resolves.toBeDefined();
  });
});
