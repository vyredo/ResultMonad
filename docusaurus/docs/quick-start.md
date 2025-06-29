# Quick Start

Get up and running with typed-result in minutes.

## Installation

```bash
npm install typed-result
# or
yarn add typed-result
# or
pnpm add typed-result
```

## Basic Usage

### Import the Library

```typescript
import { Result, Ok } from 'typed-result';
```

### Creating Results

```typescript
// Success case
const success = Result.ok(42);
console.log(success.isOk); // true
console.log(success.value); // 42

// Failure case
const failure = Result.fail<number>(new Error('Something went wrong'));
console.log(failure.isOk); // false
console.log(failure.error); // Error: Something went wrong

// String errors are automatically wrapped
const stringError = Result.fail<number>('Simple error message');
console.log(stringError.error); // Error: Simple error message
```

### Your First Function with Results

```typescript
function divide(a: number, b: number): Result<number, Error> {
  if (b === 0) {
    return Result.fail(new Error('Division by zero'));
  }
  return Result.ok(a / b);
}

// Usage
const result = divide(10, 2);
if (result.isOk) {
  console.log(`Result: ${result.value}`); // Result: 5
} else {
  console.error(`Error: ${result.error.message}`);
}
```

## Working with Results

### Pattern Matching

The `match` method provides exhaustive pattern matching for both success and error cases:

```typescript
const message = result.match(
  value => `Success: ${value}`,
  error => `Error: ${error.message}`
);
console.log(message); // "Success: 5" or "Error: ..."
```

### Transforming Values

Use `fmap` to transform success values:

```typescript
const doubled = Result.ok(21)
  .fmap(x => x * 2); // Result.ok(42)

// Errors are passed through unchanged
const failed = Result.fail<number>('Error')
  .fmap(x => x * 2); // Still Result.fail('Error')
```

### Chaining Operations

Use `flatMap` to chain operations that return Results:

```typescript
const result = Result.ok(10)
  .flatMap(x => x > 0 ? Result.ok(x * 2) : Result.fail('Negative'))
  .flatMap(x => x < 100 ? Result.ok(x + 1) : Result.fail('Too large'));
// Result.ok(21)
```

### Safe Value Extraction

```typescript
const value1 = result.unwrap(); // Throws if error
const value2 = result.unwrapSafe(); // Returns null if error  
const value3 = result.unwrapOrElse(0); // Returns fallback if error
```

## Async Operations

### Wrapping Promises

```typescript
const userResult = await Result.fromPromise(
  fetch('/api/user/123').then(r => r.json()),
  error => new Error(`API request failed: ${error}`)
);
```

### Automatic Error Handling

```typescript
const result = await Result.wrap(async () => {
  const response = await fetch('/api/data');
  if (!response.ok) {
    throw new Error('API request failed');
  }
  return response.json();
});
// Returns Result.ok(data) or Result.fail(Error)
```

## Advanced Validation

The `unwrapThrowError` method provides powerful validation chains:

```typescript
function processUser(userResult: Result<User, Error>): User {
  return userResult.unwrapThrowError(
    // Check if user exists
    user => user || 'User not found',
    
    // Check if user is active
    user => user!.isActive || 'User account is suspended',
    
    // Check permissions
    user => user!.hasPermission('read') || 'Insufficient permissions'
  );
}
```

### Early Exit Pattern

```typescript
const user = userResult.unwrapThrowError(
  // Premium users skip all other checks
  user => user?.isPremium === true, // Returns immediately if true
  
  // Regular validation for non-premium users  
  user => user?.isActive || 'Account suspended',
  user => user?.verified || 'Email not verified'
);
```

## What's Next?

- **[API Reference](./api/overview.md)** - Complete method documentation
- **[Examples](./examples/overview.md)** - Real-world usage patterns
- **[Migration Guide](./migration-guide.md)** - Moving from try-catch patterns

## Common Patterns

### Form Validation

```typescript
function validateUser(data: any): Result<User, string> {
  return Result.ok(data).unwrapThrowError(
    data => typeof data === 'object' || 'Data must be an object',
    data => data.email?.includes('@') || 'Invalid email',
    data => data.age >= 18 || 'Must be 18 or older'
  );
}
```

### API Error Handling

```typescript
async function fetchUser(id: string): Promise<Result<User, ApiError>> {
  return Result.wrap(async () => {
    const response = await fetch(`/api/users/${id}`);
    
    if (!response.ok) {
      throw {
        status: response.status,
        message: response.statusText,
        code: 'FETCH_FAILED'
      } as ApiError;
    }
    
    return response.json();
  });
}
```

### Combining Multiple Results

```typescript
const createUser = Result.lift((name: string, email: string, age: number) => ({
  name, email, age
}));

const user = createUser(
  validateName(inputName),
  validateEmail(inputEmail), 
  validateAge(inputAge)
);
// Only succeeds if all validations pass
```

Now you're ready to handle errors like a pro! 🚀