# typed-result

Rust-inspired `Result<T, E>` pattern for TypeScript — explicit error handling with full type safety.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-green.svg)](https://www.npmjs.com/package/typed-result)

---

Traditional `try-catch` in TypeScript loses type safety (caught errors are `unknown`) and makes error propagation implicit. `typed-result` makes errors explicit at the type level, forcing callers to handle failure paths.

## Quick Start

```ts
import { Result, Ok } from './src/index.js';

function divide(a: number, b: number): Result<number, Error> {
  if (b === 0) return Result.fail(new Error('Division by zero'));
  return Result.ok(a / b);
}

const result = divide(10, 2);

// Pattern matching
const message = result.match(
  value => `Result: ${value}`,
  error => `Error: ${error.message}`
);

// Chaining
const doubled = divide(10, 2)
  .map(x => x * 2)
  .flatMap(x => divide(x, 2));

// Safe extraction
const value = result.unwrapOrElse(0);
```

## Core API

### Creating Results

```ts
Result.ok(42);                              // success
Result.fail<number>('Something broke');      // failure (string auto-wraps to Error)
Result.fail<number>(new TypeError('Oops'));  // failure with custom error type
```

### Transforming Values

```ts
result.map(x => x * 2);                     // transform success, skip on failure
result.flatMap(x => maybeFail(x));          // chain Result-returning operations
result.match(onOk, onErr);                  // exhaustive pattern match
```

### Extracting Values

```ts
result.unwrap();                            // get value or throw
result.unwrapSafe();                        // get value or null
result.unwrapOrElse(defaultValue);          // get value or fallback
result.unwrapReturnError();                 // get value or the error object
```

### `unwrapThrowError` — Validation Chains

Chain validation callbacks with control flow:

```ts
result.unwrapThrowError(
  value => value > 0 || 'Must be positive',
  value => value < 100 || 'Must be under 100',
  value => true    // true = escape, return value immediately
);
```

Callback return values control flow:
- `false` / `undefined` → continue to next validation
- `true` → escape and return value immediately
- `string` → throw `new Error(string)`
- `object` → throw that object directly

### Async Support

```ts
// Wrap async operations — catches thrown errors as Result.fail
const user = await Result.wrap(async () => {
  const response = await fetch('/api/user');
  if (!response.ok) throw new Error('API request failed');
  return response.json();
});

// Convert promises to Results
const result = await Result.fromPromise(
  fetchUser(id),
  error => new Error(`Failed: ${error}`)
);
```

### Combining Results

```ts
const add = Result.lift((a: number, b: number, c: number) => a + b + c);
const sum = add(Result.ok(1), Result.ok(2), Result.ok(3));  // Result.ok(6)
```

### Side Effects

```ts
result.onSuccess(value => console.log('Got:', value));
result.onFailure(error => console.error('Failed:', error.message));
```

## Development

```bash
npm install          # dev dependencies only (jest, typescript, esbuild)
npm run typecheck    # strict TypeScript check
npm test             # 58 tests (unit + integration)
npm run build        # build CJS + ESM
```

## License

MIT © [Vidy Alfredo](https://github.com/vyredo)
