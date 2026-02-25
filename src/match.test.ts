import { describe, it, expect } from "vitest";
import { Ok, Err } from "./result";
import { match, when, _ } from "./match";

// ─────────────────────────────────────────────
// Result overload
// ─────────────────────────────────────────────

describe("match — Result<T, E>", () => {
  it("invokes the Ok handler when result is Ok", () => {
    // Arrange
    const result = Ok(42);

    // Act
    const message = match(result, {
      Ok: (n) => `value is ${n}`,
      Err: () => "failed",
    });

    // Assert
    expect(message).toBe("value is 42");
  });

  it("invokes the Err handler when result is Err", () => {
    // Arrange
    const result = Err("not found");

    // Act
    const message = match(result, {
      Ok: () => "success",
      Err: (e) => `error: ${e}`,
    });

    // Assert
    expect(message).toBe("error: not found");
  });

  it("passes the unwrapped Ok value to its handler", () => {
    // Arrange
    const result = Ok({ id: 1, name: "Bismarck" });

    // Act
    const name = match(result, {
      Ok: (user) => user.name,
      Err: () => "unknown",
    });

    // Assert
    expect(name).toBe("Bismarck");
  });

  it("passes the unwrapped Err value to its handler", () => {
    // Arrange
    const result = Err({ code: 404, message: "not found" });

    // Act
    const code = match(result, {
      Ok: () => 0,
      Err: (e) => e.code,
    });

    // Assert
    expect(code).toBe(404);
  });
});

// ─────────────────────────────────────────────
// Primitive literals
// ─────────────────────────────────────────────

describe("match — primitive literals", () => {
  it("matches a string literal and returns the corresponding arm", () => {
    // Arrange & Act
    const label = match("hello", {
      hello: () => "Hi!",
      bye: () => "Goodbye!",
    });

    // Assert
    expect(label).toBe("Hi!");
  });

  it("matches a number literal converted to string key", () => {
    // Arrange & Act
    const label = match(404, {
      200: () => "OK",
      404: () => "Not Found",
      500: () => "Server Error",
    });

    // Assert
    expect(label).toBe("Not Found");
  });
});

// ─────────────────────────────────────────────
// Discriminated unions
// ─────────────────────────────────────────────

describe("match — discriminated union via _tag", () => {
  type Shape =
    | { _tag: "circle"; radius: number }
    | { _tag: "square"; side: number };

  it("matches the circle variant and computes the correct area", () => {
    // Arrange
    const shape: Shape = { _tag: "circle", radius: 2 };

    // Act
    const area = match(shape, {
      circle: ({ radius }) => Math.PI * radius ** 2,
      square: ({ side }) => side ** 2,
    });

    // Assert
    expect(area).toBeCloseTo(Math.PI * 4);
  });

  it("matches the square variant and computes the correct area", () => {
    // Arrange
    const shape: Shape = { _tag: "square", side: 3 };

    // Act
    const area = match(shape, {
      circle: ({ radius }) => Math.PI * radius ** 2,
      square: ({ side }) => side ** 2,
    });

    // Assert
    expect(area).toBe(9);
  });
});

describe("match — discriminated union via kind", () => {
  type Event =
    | { kind: "click"; x: number; y: number }
    | { kind: "keydown"; key: string };

  it("matches the click event using the kind field", () => {
    // Arrange
    const event: Event = { kind: "click", x: 10, y: 20 };

    // Act
    const description = match(event, {
      click: ({ x, y }) => `clicked at (${x}, ${y})`,
      keydown: ({ key }) => `pressed ${key}`,
    });

    // Assert
    expect(description).toBe("clicked at (10, 20)");
  });
});

// ─────────────────────────────────────────────
// when() guards
// ─────────────────────────────────────────────

describe("match — when() guards", () => {
  it("evaluates guards in order and returns the first match", () => {
    // Arrange
    const score = 92;

    // Act
    const grade = match(score, {
      [when((n: number) => n >= 90)]: () => "A",
      [when((n: number) => n >= 75)]: () => "B",
      [when((n: number) => n >= 60)]: () => "C",
      [_]: () => "F",
    });

    // Assert
    expect(grade).toBe("A");
  });

  it("falls through to a later guard when earlier ones do not match", () => {
    // Arrange
    const score = 78;

    // Act
    const grade = match(score, {
      [when((n: number) => n >= 90)]: () => "A",
      [when((n: number) => n >= 75)]: () => "B",
      [when((n: number) => n >= 60)]: () => "C",
      [_]: () => "F",
    });

    // Assert
    expect(grade).toBe("B");
  });
});

// ─────────────────────────────────────────────
// Wildcard _
// ─────────────────────────────────────────────

describe("match — wildcard _", () => {
  it("matches the wildcard arm when no other arm matches", () => {
    // Arrange & Act
    const result = match("unknown", {
      hello: () => "Hi!",
      [_]: (v) => `unknown: ${v}`,
    });

    // Assert
    expect(result).toBe("unknown: unknown");
  });

  it("does not invoke the wildcard arm when a literal arm matches first", () => {
    // Arrange & Act
    const result = match("hello", {
      hello: () => "Hi!",
      [_]: () => "wildcard",
    });

    // Assert
    expect(result).toBe("Hi!");
  });
});

// ─────────────────────────────────────────────
// No match
// ─────────────────────────────────────────────

describe("match — exhaustiveness", () => {
  it("throws when no arm matches and no wildcard is provided", () => {
    expect(() =>
      match("missing", {
        hello: () => "Hi!",
      } as Record<string, () => string>),
    ).toThrow("match(): no arm matched value");
  });
});
