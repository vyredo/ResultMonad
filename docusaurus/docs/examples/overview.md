# Examples Overview

Real-world examples showing how to use typed-result in common scenarios.

## Quick Examples

### Basic Error Handling

```typescript
import { Result } from 'typed-result';

function parseJSON(text: string): Result<any, Error> {
  return Result.wrap(() => JSON.parse(text));
}

// Usage
const result = parseJSON('{"name": "John"}');
result.match(
  data => console.log('Parsed:', data),
  error => console.error('Parse failed:', error.message)
);
```

### Function Composition

```typescript
function processNumber(input: string): Result<string, Error> {
  return Result.wrap(() => parseInt(input))
    .flatMap(num => num > 0 ? Result.ok(num) : Result.fail('Must be positive'))
    .fmap(num => num * 2)
    .fmap(num => `Result: ${num}`);
}

console.log(processNumber("5")); // Result.ok("Result: 10")
console.log(processNumber("-3")); // Result.fail("Must be positive")
```

### Async Operations

```typescript
async function fetchUserData(id: string): Promise<Result<User, Error>> {
  return Result.wrap(async () => {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  });
}

// Usage
const userData = await fetchUserData("123");
userData.match(
  user => console.log('User:', user.name),
  error => console.error('Failed to fetch user:', error.message)
);
```

## Real-World Examples

### [API Error Handling](./api-error-handling.md)
Learn how to handle HTTP requests, status codes, and API errors gracefully.

**Topics covered:**
- HTTP status code handling
- Custom error types
- Retry logic
- Error categorization

### [Form Validation](./form-validation.md)
Build robust form validation with clear error messages and type safety.

**Topics covered:**
- Field validation
- Combining validation results
- Custom validation rules
- Error message composition

### [Database Operations](./database-operations.md)
Handle database queries, transactions, and connection errors safely.

**Topics covered:**
- Query error handling
- Transaction management
- Connection pooling
- Data validation

### [Async Operations](./async-operations.md)
Master async/await patterns with Result types for reliable async code.

**Topics covered:**
- Promise wrapping
- Sequential operations
- Parallel operations
- Timeout handling

## Common Patterns

### Validation Chains

```typescript
interface User {
  name: string;
  email: string;
  age: number;
}

function validateUser(data: any): Result<User, string> {
  return Result.ok(data).unwrapThrowError(
    // Type validation
    data => typeof data === 'object' || 'Data must be an object',
    
    // Required fields
    data => data.name || 'Name is required',
    data => data.email || 'Email is required', 
    data => typeof data.age === 'number' || 'Age must be a number',
    
    // Format validation
    data => data.email.includes('@') || 'Invalid email format',
    data => data.age >= 18 || 'Must be 18 or older',
    
    // Return validated user
    data => ({ name: data.name, email: data.email, age: data.age })
  );
}
```

### Error Recovery

```typescript
function fetchWithFallback(primaryUrl: string, fallbackUrl: string) {
  return Result.wrap(() => fetch(primaryUrl))
    .flatMap(response => 
      response.ok 
        ? Result.ok(response) 
        : Result.fail(new Error('Primary failed'))
    )
    .match(
      response => response,
      error => {
        console.log('Primary failed, trying fallback...');
        return fetch(fallbackUrl);
      }
    );
}
```

### Combining Results

```typescript
const createOrder = Result.lift((
  customer: Customer,
  product: Product, 
  payment: PaymentMethod
) => ({
  customer,
  product,
  payment,
  createdAt: new Date()
}));

// Only succeeds if all inputs are valid
const order = createOrder(
  validateCustomer(customerData),
  validateProduct(productData),
  validatePayment(paymentData)
);
```

### Resource Management

```typescript
async function processFile(filename: string): Promise<Result<ProcessedData, Error>> {
  return Result.wrap(async () => {
    const file = await openFile(filename);
    try {
      const data = await processFileContent(file);
      const validated = await validateData(data);
      return validated;
    } finally {
      await closeFile(file);
    }
  });
}
```

## Migration Examples

### From try-catch

```typescript
// Before: Traditional error handling
async function getUser(id: string) {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      throw new Error('User not found');
    }
    const user = await response.json();
    if (!user.isActive) {
      throw new Error('User is inactive');
    }
    return user;
  } catch (error) {
    console.error('Error:', error.message);
    return null;
  }
}

// After: With typed-result
async function getUser(id: string): Promise<Result<User, Error>> {
  return Result.wrap(async () => {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      throw new Error('User not found');
    }
    return response.json();
  }).then(result => 
    result.unwrapThrowError(
      user => user.isActive || 'User is inactive'
    )
  );
}
```

### From callback patterns

```typescript
// Before: Callback-style error handling
function readConfig(callback: (error: Error | null, config?: Config) => void) {
  fs.readFile('config.json', (err, data) => {
    if (err) {
      callback(err);
      return;
    }
    
    try {
      const config = JSON.parse(data.toString());
      callback(null, config);
    } catch (parseError) {
      callback(parseError);
    }
  });
}

// After: Promise + Result pattern
async function readConfig(): Promise<Result<Config, Error>> {
  return Result.fromPromise(
    fs.promises.readFile('config.json', 'utf8'),
    error => new Error(`Failed to read config: ${error}`)
  ).then(result => 
    result.flatMap(data => 
      Result.wrap(() => JSON.parse(data))
    )
  );
}
```

## Best Practices

1. **Use specific error types** - Don't just use `Error`, create meaningful error types
2. **Validate early** - Use `unwrapThrowError` for input validation
3. **Chain operations** - Use `fmap` and `flatMap` to build pipelines
4. **Handle errors explicitly** - Always use `match` or appropriate unwrap methods
5. **Compose functions** - Use `Result.lift` to combine multiple Results

## Testing with Results

```typescript
import { Result } from 'typed-result';

describe('validateUser', () => {
  it('should succeed with valid data', () => {
    const result = validateUser({
      name: 'John',
      email: 'john@example.com',
      age: 25
    });
    
    expect(result.isOk).toBe(true);
    expect(result.value?.name).toBe('John');
  });
  
  it('should fail with invalid email', () => {
    const result = validateUser({
      name: 'John',
      email: 'invalid-email',
      age: 25
    });
    
    expect(result.isOk).toBe(false);
    expect(result.error?.message).toContain('Invalid email');
  });
});
```

Ready to dive deeper? Pick an example that matches your use case!