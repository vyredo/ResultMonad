# API Overview

typed-result provides a comprehensive set of methods for working with Result types. This page gives you an overview of all available functionality.

## Core Types

### `Result<T, E>`

The main Result type that can be either a success containing a value of type `T` or a failure containing an error of type `E`.

```typescript
// Success type
type ResultSuccess<T> = {
  readonly isOk: true;
  readonly value: T;
  readonly error: undefined;
}

// Failure type  
type ResultFail<T, E> = {
  readonly isOk: false;
  readonly value: undefined;
  readonly error: E;
}
```

### `ReturnResult<T, E>`

A union type combining success and failure cases:

```typescript
type ReturnResult<T, E extends Error = Error> = 
  | ResultSuccess<T> 
  | ResultFail<T, E>;
```

## Static Methods

These methods are called on the `Result` class itself.

| Method | Description | Example |
|--------|-------------|---------|
| `Result.ok<T>(value)` | Creates a successful Result | `Result.ok(42)` |
| `Result.fail<T, E>(error)` | Creates a failed Result | `Result.fail('Error')` |
| `Result.fromPromise<T, E>(promise, errorMapper)` | Converts Promise to Result | `await Result.fromPromise(fetch(...), e => new Error(e))` |
| `Result.wrap<T>(operation)` | Wraps function execution | `Result.wrap(() => JSON.parse(str))` |
| `Result.lift<Args, R>(fn)` | Lifts function to work with Results | `Result.lift((a, b) => a + b)` |

## Instance Methods

These methods are called on Result instances.

### Transformation Methods

| Method | Description | Example |
|--------|-------------|---------|
| `fmap<U>(fn)` | Transform success value | `result.fmap(x => x * 2)` |
| `flatMap<U>(fn)` | Chain Result-returning operations | `result.flatMap(x => Result.ok(x + 1))` |

### Pattern Matching

| Method | Description | Example |
|--------|-------------|---------|
| `match<U>(onSuccess, onFailure)` | Handle both success and failure | `result.match(v => v, e => 0)` |

### Value Extraction

| Method | Description | Throws | Example |
|--------|-------------|--------|---------|
| `unwrap()` | Extract value or throw | ✅ | `result.unwrap()` |
| `unwrapSafe()` | Extract value or return null | ❌ | `result.unwrapSafe()` |
| `unwrapOrElse(fallback)` | Extract value or return fallback | ❌ | `result.unwrapOrElse(0)` |
| `unwrapReturnError()` | Extract value or return error | ❌ | `result.unwrapReturnError()` |
| `unwrapThrowError(...callbacks)` | Advanced validation with custom logic | ✅ | `result.unwrapThrowError(v => v > 0 \|\| 'Must be positive')` |

### Functional Programming

| Method | Description | Example |
|--------|-------------|---------|
| `ap<A, B>(otherResult)` | Apply Result-wrapped function | `fnResult.ap(valueResult)` |

### Side Effects

| Method | Description | Example |
|--------|-------------|---------|
| `onSuccess(fn)` | Execute function on success | `result.onSuccess(console.log)` |
| `onFailure(fn)` | Execute function on failure | `result.onFailure(console.error)` |

## Method Categories

### For Beginners

Start with these essential methods:

- `Result.ok()` / `Result.fail()` - Creating Results
- `match()` - Pattern matching
- `unwrapOrElse()` - Safe value extraction
- `fmap()` - Basic transformations

### For Intermediate Users

Once comfortable with basics:

- `flatMap()` - Chaining operations
- `Result.wrap()` - Automatic error handling
- `unwrapThrowError()` - Validation chains
- `Result.fromPromise()` - Promise integration

### For Advanced Users

For complex scenarios:

- `Result.lift()` - Combining multiple Results
- `ap()` - Applicative functor operations
- Custom error types with validation
- Complex async patterns

## Error Handling Philosophy

typed-result follows these principles:

1. **Explicit Error Handling** - Errors are part of the type signature
2. **Composability** - Operations can be chained safely
3. **Type Safety** - TypeScript knows about both success and error cases
4. **Predictability** - Mathematical laws ensure consistent behavior

## Common Usage Patterns

### Simple Error Handling

```typescript
function divide(a: number, b: number): Result<number, Error> {
  if (b === 0) return Result.fail(new Error('Division by zero'));
  return Result.ok(a / b);
}

const result = divide(10, 2).match(
  value => `Result: ${value}`,
  error => `Error: ${error.message}`
);
```

### Chaining Operations

```typescript
const result = Result.ok(10)
  .fmap(x => x * 2)           // Transform: 20
  .flatMap(x => 
    x > 15 ? Result.ok(x) : Result.fail('Too small')
  )                           // Validate: 20 > 15, so Result.ok(20)
  .fmap(x => x.toString());   // Transform: "20"
```

### Async Operations

```typescript
async function fetchUserProfile(id: string) {
  return Result.wrap(async () => {
    const user = await fetchUser(id);
    const profile = await fetchProfile(user.id);
    return { user, profile };
  });
}
```

### Validation Chains

```typescript
function validateInput(data: unknown): Result<ValidData, Error> {
  return Result.ok(data).unwrapThrowError(
    data => typeof data === 'object' || 'Must be object',
    data => 'name' in data! || 'Name required',
    data => 'email' in data! || 'Email required',
    data => (data as any).email.includes('@') || 'Invalid email'
  );
}
```

## Next Steps

- **[Result Class](./result-class.md)** - Detailed Result class documentation
- **[Static Methods](./static-methods.md)** - Factory and utility methods  
- **[Instance Methods](./instance-methods.md)** - Methods for working with Result instances
- **[Types](./types.md)** - TypeScript type definitions