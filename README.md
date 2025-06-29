# typed-result


## Why typed-result?

Traditional error handling in JavaScript/TypeScript using try-catch blocks has several limitations:

- **Loss of type safety**: Caught errors are typed as `any` or `unknown`
- **Implicit error propagation**: Functions don't declare what errors they might throw
- **Verbose error handling**: Try-catch blocks add noise to your code
- **Inconsistent patterns**: Mix of exceptions, callbacks, and promise rejections

`typed-result` brings Rust's powerful `Result<T, E>` pattern to TypeScript, providing:

- ✅ **Full type safety** for both success and error cases
- ✅ **Explicit error handling** that's enforced at compile time
- ✅ **Composable operations** with functional methods like `map`, `flatMap`, and `match`
- ✅ **Zero dependencies** and minimal bundle size (~3KB gzipped)
- ✅ **Seamless async support** with Promise integration
- ✅ **Excellent developer experience** with comprehensive TypeScript support

## Installation

```bash
npm install typed-result
# or
yarn add typed-result
# or
pnpm add typed-result
```

## Quick Start

```typescript
import { Result, Ok } from 'typed-result';

// Define a function that can fail
function divide(a: number, b: number): Result<number, Error> {
  if (b === 0) {
    return Result.fail(new Error('Division by zero'));
  }
  return Result.ok(a / b);
}

// Use the result
const result = divide(10, 2);

// Pattern matching
const message = result.match(
  value => `Result: ${value}`,
  error => `Error: ${error.message}`
);

// Chaining operations
const doubled = divide(10, 2)
  .fmap(x => x * 2)
  .flatMap(x => divide(x, 2));

// Safe unwrapping
const value = result.unwrapOrElse(0); // Returns 5 or 0 if error
```

## Core Concepts

### Creating Results

```typescript
// Success
const success = Result.ok(42);
const alsoSuccess = Ok(42); // Alias

// Failure
const failure = Result.fail<number>(new Error('Something went wrong'));
const stringError = Result.fail<number>('Error message'); // Auto-wrapped in Error
```

### Working with Results

```typescript
// Transform success values
const doubled = result.fmap(x => x * 2);

// Chain operations that might fail
const chained = result.flatMap(x => 
  x > 0 ? Result.ok(Math.sqrt(x)) : Result.fail('Negative number')
);

// Pattern matching
result.match(
  value => console.log('Success:', value),
  error => console.error('Error:', error)
);

// Extract values
const value = result.unwrap(); // Throws if error
const safeValue = result.unwrapOrElse(defaultValue); // Returns default if error
const nullable = result.unwrapSafe(); // Returns null if error
```

### Async Operations

```typescript
// Convert promises to Results
const userResult = await Result.fromPromise(
  fetchUser(id),
  error => new Error(`Failed to fetch user: ${error}`)
);

// Automatic error handling with decorators
class UserService {
  async getUser(id: string): Promise<Result<User, Error>> {
    return Result.wrap(async () => {
      const user = await db.users.findById(id);
      if (!user) {
        throw new Error('User not found');
      }
      return user; // Automatically wrapped in Result.ok
    });
  }
}
```

### Advanced Features

```typescript
// Combine multiple Results
const sum = Result.lift((a: number, b: number) => a + b);
const result = sum(Result.ok(1), Result.ok(2)); // Result.ok(3)

// Side effects
result
  .onSuccess(value => console.log('Success:', value))
  .onFailure(error => console.error('Error:', error));
```

## Structured Error Handling with `unwrapThrowError`

In real-world applications, **error handling often represents 50% of your code**. The `unwrapThrowError` method provides a powerful way to structure complex validation and error handling logic in a clean, readable manner.

### The Problem: Complex Validation Chains

Traditional validation often leads to nested conditions and repetitive error handling:

```typescript
// Traditional approach - verbose and hard to follow
async function processUser(result: Result<User, Error>) {
  let user;
  try {
    user = result.unwrap();
  } catch (error) {
    throw new Error('Failed to get user');
  }

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.isActive) {
    throw new Error('User is inactive');
  }

  if (user.age < 18) {
    throw new Error('User must be 18 or older');
  }

  if (!user.email.includes('@')) {
    throw new Error('Invalid email format');
  }

  return user;
}
```

### The Solution: Validation Chains

`unwrapThrowError` lets you chain validation logic in a clear, declarative way:

```typescript
// Clean, structured validation
async function processUser(result: Result<User, Error>) {
  return result.unwrapThrowError(
    // Check if user exists
    (user, error) => user || 'User not found',
    
    // Check if user is active
    user => user!.isActive || 'User is inactive',
    
    // Check age requirement
    user => user!.age >= 18 || 'User must be 18 or older',
    
    // Validate email format
    user => user!.email.includes('@') || 'Invalid email format'
  );
}
```

### How It Works

The method processes validation callbacks in order:

- **`string` return**: Throws error with that message
- **`false` return**: Continues to next validation  
- **`true` return**: **Immediately returns value** (escapes remaining validations)
- **`object` return**: Throws the object as a custom error
- **`void/undefined`**: Continues to next validation

### Advanced Patterns

#### Early Success with Business Logic

```typescript
// Skip expensive validations for premium users
const user = userResult.unwrapThrowError(
  // Premium users bypass all other checks
  user => user?.isPremium === true,
  
  // Regular validation for non-premium users
  user => user?.isActive || 'Account is suspended',
  user => user?.hasValidSubscription || 'Subscription required',
  user => user?.passedKYC || 'KYC verification required'
);
```

#### Custom Error Objects

```typescript
interface ValidationError {
  code: string;
  field: string;
  message: string;
}

const validatedData = result.unwrapThrowError(
  // Type validation
  data => typeof data === 'object' || {
    code: 'INVALID_TYPE',
    field: 'root',
    message: 'Data must be an object'
  },
  
  // Required field validation  
  data => 'email' in data! || {
    code: 'REQUIRED_FIELD',
    field: 'email', 
    message: 'Email is required'
  },
  
  // Format validation
  data => (data as any).email.includes('@') || {
    code: 'INVALID_FORMAT',
    field: 'email',
    message: 'Invalid email format'
  }
);
```

#### Database Error Handling

```typescript
async function fetchUserSafely(id: string) {
  const result = await Result.wrap(() => database.users.findById(id));
  
  return result.unwrapThrowError(
    // Handle database connection errors
    (user, error) => {
      if (error?.message.includes('connection')) {
        return { code: 'DB_CONNECTION', message: 'Database unavailable' };
      }
      return false; // Continue to next check
    },
    
    // Handle not found
    (user, error) => user || { code: 'NOT_FOUND', message: 'User not found' },
    
    // Validate user status
    user => user!.deletedAt === null || { code: 'DELETED', message: 'User was deleted' },
    
    // Check permissions
    user => user!.isActive || { code: 'INACTIVE', message: 'User account is inactive' }
  );
}
```

#### API Response Validation

```typescript
async function fetchApiData(url: string) {
  const result = await Result.wrap(() => fetch(url).then(r => r.json()));
  
  return result.unwrapThrowError(
    // Check for network errors first
    (data, error) => {
      if (error?.name === 'NetworkError') {
        return { status: 503, message: 'Service unavailable' };
      }
      return false;
    },
    
    // Validate response structure
    data => data && typeof data === 'object' || 'Invalid response format',
    
    // Check for API errors
    data => !data!.error || `API Error: ${data!.error.message}`,
    
    // Validate required fields
    data => 'id' in data! || 'Missing required field: id',
    data => 'name' in data! || 'Missing required field: name'
  );
}
```

### Benefits

✅ **Reduced Complexity**: Transform nested if-statements into linear validation chains  
✅ **Early Exit**: Stop processing on first success condition  
✅ **Custom Errors**: Return rich error objects with context  
✅ **Readable Flow**: Each validation step is clearly defined  
✅ **Error Context**: Access both success values and original errors  
✅ **Flexible Logic**: Mix boolean checks with custom error objects

### When to Use

- **Complex validation workflows** with multiple steps
- **API response processing** with various error conditions  
- **Database operations** requiring multiple safety checks
- **User input validation** with detailed error messages
- **Business logic** with conditional requirements

This approach transforms error handling from scattered try-catch blocks into **structured, testable, and maintainable validation pipelines**.

## Real-World Examples

### API Error Handling

```typescript
interface ApiError extends Error {
  status: number;
  code: string;
}

async function fetchUserProfile(id: string): Promise<Result<UserProfile, ApiError>> {
  return Result.wrap(async () => {
    const response = await fetch(`/api/users/${id}`);
    
    if (!response.ok) {
      throw {
        name: 'ApiError',
        message: response.statusText,
        status: response.status,
        code: 'USER_FETCH_FAILED'
      } as ApiError;
    }
    
    return response.json();
  });
}

// Usage
const profile = await fetchUserProfile('123');
profile.match(
  user => updateUI(user),
  error => {
    if (error.status === 404) {
      showNotFound();
    } else {
      showError(error.message);
    }
  }
);
```

### Form Validation

```typescript
type ValidationError = { field: string; message: string };

function validateEmail(email: string): Result<string, ValidationError> {
  if (!email.includes('@')) {
    return Result.fail({ field: 'email', message: 'Invalid email format' });
  }
  return Result.ok(email);
}

function validateAge(age: number): Result<number, ValidationError> {
  if (age < 18) {
    return Result.fail({ field: 'age', message: 'Must be 18 or older' });
  }
  return Result.ok(age);
}

// Combine validations
const validateUser = Result.lift((email: string, age: number) => ({ email, age }));
const result = validateUser(validateEmail(email), validateAge(age));
```

### Database Transactions

```typescript
async function createUserWithProfile(userData: UserData, profileData: ProfileData) {
  return Result.wrap(async () => {
    const tx = await db.beginTransaction();
    
    try {
      const user = await db.users.create(userData, { transaction: tx });
      const profile = await db.profiles.create(
        { ...profileData, userId: user.id }, 
        { transaction: tx }
      );
      
      await tx.commit();
      return { user, profile };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  });
}

// Usage with error handling
const result = await createUserWithProfile(userData, profileData);
result.match(
  ({ user, profile }) => console.log('Created user and profile'),
  error => console.error('Transaction failed:', error)
);
```

## Advanced Patterns

### Mathematical Foundations

typed-result is built on solid **category theory** foundations that provide mathematical guarantees about how your error handling behaves. These patterns aren't just academic concepts—they're practical tools that make your code more predictable and reliable:

#### Functor Laws (fmap)
```typescript
// Identity: mapping identity function returns the same result
result.fmap(x => x) === result

// Composition: mapping composed functions equals composing mapped functions  
result.fmap(f).fmap(g) === result.fmap(x => g(f(x)))
```

#### Applicative Laws (lift, ap)
```typescript
// Allows combining multiple independent computations
const add3 = Result.lift((a: number, b: number, c: number) => a + b + c);
const result = add3(Result.ok(1), Result.ok(2), Result.ok(3)); // Result.ok(6)

// Short-circuits on first error
const result2 = add3(Result.fail('error'), Result.ok(2), Result.ok(3)); // Result.fail('error')
```

#### Monad Laws (flatMap)
```typescript
// Left identity: wrapping a value then flatMapping equals applying the function
Result.ok(x).flatMap(f) === f(x)

// Right identity: flatMapping with Result.ok returns the same result
result.flatMap(Result.ok) === result

// Associativity: order of flatMap operations doesn't matter
result.flatMap(f).flatMap(g) === result.flatMap(x => f(x).flatMap(g))
```

### Why This Matters

These mathematical properties ensure:

- **Predictable behavior**: Operations always behave consistently
- **Safe refactoring**: You can reorganize code without changing behavior  
- **Composable operations**: Combine simple operations to build complex ones
- **Testing simplicity**: Mathematical laws provide built-in test cases

### Imperative Style with Strong Error Handling

```typescript
// Traditional error handling - nested try-catch
async function processOrder(orderId: string) {
  try {
    const order = await fetchOrder(orderId);
    try {
      const payment = await processPayment(order.paymentId);
      try {
        const shipping = await scheduleShipping(order.items);
        try {
          const confirmation = await sendConfirmation(order.email);
          return { order, payment, shipping, confirmation };
        } catch (e4) { return handleError(e4); }
      } catch (e3) { return handleError(e3); }
    } catch (e2) { return handleError(e2); }
  } catch (e1) { return handleError(e1); }
}

// Imperative style with Result.wrap - clear and readable
async function processOrder(orderId: string) {
  const order = await Result.wrap(() => fetchOrder(orderId)).unwrapThrowError();
  const payment = await Result.wrap(() => processPayment(order.paymentId)).unwrapThrowError();
  const shipping = await Result.wrap(() => scheduleShipping(order.items)).unwrapThrowError();
  const confirmation = await Result.wrap(() => sendConfirmation(order.email)).unwrapThrowError();
  
  return { order, payment, shipping, confirmation };
}
```

### Functional Composition

You can combine operations using both imperative and functional styles depending on your preference:

```typescript
// Functional style - when you need composition
async function fetchUserData(userId: string) {
  const [profileResult, settingsResult, preferencesResult] = await Promise.all([
    Result.wrap(() => fetchUserProfile(userId)),
    Result.wrap(() => fetchUserSettings(userId)),
    Result.wrap(() => fetchUserPreferences(userId))
  ]);

  // Combine results - fails if any operation failed
  const combineUserData = Result.lift((
    profile: UserProfile, 
    settings: UserSettings, 
    preferences: UserPreferences
  ) => ({ profile, settings, preferences }));

  return combineUserData(profileResult, settingsResult, preferencesResult);
}

// Imperative style - when you need sequential operations
async function fetchUserDataImperative(userId: string) {
  const profile = await Result.wrap(() => fetchUserProfile(userId)).unwrapThrowError();
  const settings = await Result.wrap(() => fetchUserSettings(userId)).unwrapThrowError();
  const preferences = await Result.wrap(() => fetchUserPreferences(userId)).unwrapThrowError();
  
  return { profile, settings, preferences };
}
```

### Custom Error Types with Validation Chains

```typescript
class ValidationError extends Error {
  constructor(public field: string, public code: string, message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function validateUser(data: unknown): Result<User, ValidationError> {
  return Result.ok(data)
    .unwrapThrowError(
      // Type validation
      data => typeof data === 'object' && data !== null || 
        new ValidationError('root', 'INVALID_TYPE', 'Must be an object'),
      
      // Required fields
      data => 'email' in data! || 
        new ValidationError('email', 'REQUIRED', 'Email is required'),
      
      // Email format
      data => typeof (data as any).email === 'string' && (data as any).email.includes('@') || 
        new ValidationError('email', 'INVALID_FORMAT', 'Invalid email format'),
      
      // Age validation
      data => typeof (data as any).age === 'number' && (data as any).age >= 18 || 
        new ValidationError('age', 'MIN_AGE', 'Must be 18 or older'),
      
      // Return validated object
      data => data as User
    );
}
```

> 💡 **New to functional programming?** Don't worry! You can use typed-result effectively with just `Result.ok()`, `Result.fail()`, `map()`, and `match()`. The advanced patterns above are powerful tools that become useful as your applications grow in complexity.

## API Reference

### Static Methods

| Method | Description | Example |
|--------|-------------|---------|
| `Result.ok<T>(value: T)` | Creates a successful Result | `Result.ok(42)` |
| `Result.fail<T, E>(error: E \| string)` | Creates a failed Result | `Result.fail('Error')` |
| `Result.fromPromise<T, E>(promise, errorFn)` | Converts Promise to Result | `await Result.fromPromise(fetch(...))` |
| `Result.wrap<T>(fn)` | Wraps function execution | `Result.wrap(() => JSON.parse(str))` |
| `Result.lift<Args, R>(fn)` | Lifts function to work with Results | `Result.lift((a, b) => a + b)` |

### Instance Methods

| Method | Description | Example |
|--------|-------------|---------|
| `map<U>(fn)` | Transform success value | `result.map(x => x * 2)` |
| `flatMap<U>(fn)` | Chain Result-returning operations | `result.flatMap(x => Result.ok(x + 1))` |
| `match<U>(onOk, onFail)` | Pattern matching | `result.match(v => v, e => 0)` |
| `unwrap()` | Extract value or throw | `result.unwrap()` |
| `unwrapOr(default)` | Extract value or return default | `result.unwrapOr(0)` |
| `unwrapThrowError(...callbacks)` | Advanced validation with custom logic | `result.unwrapThrowError(v => v > 0 \|\| 'Must be positive')` |
| `unwrapSafe()` | Extract value or return null | `result.unwrapSafe()` |
| `onSuccess(fn)` | Side effect on success | `result.onSuccess(console.log)` |
| `onFailure(fn)` | Side effect on failure | `result.onFailure(console.error)` |

## Migration Guide

### From try-catch

```typescript
// Before
function parseJson(str: string): any {
  try {
    return JSON.parse(str);
  } catch (error) {
    console.error('Parse failed:', error);
    return null;
  }
}

// After
function parseJson(str: string): Result<any, Error> {
  return Result.wrap(() => JSON.parse(str));
}

// Usage
const result = parseJson(jsonString);
result.match(
  data => processData(data),
  error => console.error('Parse failed:', error)
);
```

### From Promise.catch

```typescript
// Before
fetchUser(id)
  .then(user => processUser(user))
  .catch(error => handleError(error));

// After
const result = await Result.fromPromise(
  fetchUser(id),
  error => new Error(`Failed to fetch user: ${error}`)
);

result
  .fmap(user => processUser(user))
  .onFailure(error => handleError(error));
```

## TypeScript Integration

typed-result is built with TypeScript-first design:

```typescript
// Full type inference
const result = Result.ok(42); // Result<number, never>
const mapped = result.map(x => x.toString()); // Result<string, never>

// Custom error types
interface ApiError extends Error {
  status: number;
  code: string;
}

function fetchData(): Result<Data, ApiError> {
  // Implementation
}

// Type-safe error handling
fetchData().match(
  data => data.process(), // TypeScript knows this is Data
  error => error.status   // TypeScript knows this is ApiError
);
```

## Documentation

<!-- Visit our [documentation site](https://typed-result.dev) for:

- 📚 [Complete API Reference](https://typed-result.dev/api)
- 🎮 [Interactive Examples](https://typed-result.dev/playground)
- 📖 [Guides and Tutorials](https://typed-result.dev/guides)
- 🚀 [Migration Guide](https://typed-result.dev/migration)
- 💡 [Best Practices](https://typed-result.dev/best-practices) -->

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

```bash
# Clone the repository
git clone https://github.com/yourusername/typed-result.git

# Install dependencies
npm install

# Run tests
npm test

# Build the project
npm run build
```

## License

MIT © [typed-result contributors](LICENSE)

---

<p align="center">
  Made with ❤️ by the TypeScript community
</p>