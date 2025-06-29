# API Error Handling

Learn how to handle HTTP requests and API errors gracefully using typed-result.

## Basic API Request

```typescript
import { Result } from 'typed-result';

interface ApiError extends Error {
  status: number;
  code: string;
}

async function fetchUser(id: string): Promise<Result<User, ApiError>> {
  return Result.wrap(async () => {
    const response = await fetch(`/api/users/${id}`);
    
    if (!response.ok) {
      throw {
        name: 'ApiError',
        message: response.statusText,
        status: response.status,
        code: 'FETCH_FAILED'
      } as ApiError;
    }
    
    return response.json();
  });
}
```

## Handling Different Status Codes

```typescript
interface HttpError extends Error {
  status: number;
  body?: any;
}

async function apiRequest<T>(url: string): Promise<Result<T, HttpError>> {
  return Result.wrap(async () => {
    const response = await fetch(url);
    const body = await response.json().catch(() => null);
    
    if (!response.ok) {
      const error: HttpError = {
        name: 'HttpError',
        message: `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
        body
      };
      throw error;
    }
    
    return body;
  });
}

// Usage with status code handling
const result = await apiRequest<User>('/api/users/123');

result.match(
  user => console.log('User:', user),
  error => {
    switch (error.status) {
      case 404:
        console.log('User not found');
        break;
      case 401:
        console.log('Authentication required');
        break;
      case 500:
        console.log('Server error');
        break;
      default:
        console.log('Unknown error:', error.message);
    }
  }
);
```

## API Client with Retry Logic

```typescript
class ApiClient {
  private baseUrl: string;
  private maxRetries: number;

  constructor(baseUrl: string, maxRetries = 3) {
    this.baseUrl = baseUrl;
    this.maxRetries = maxRetries;
  }

  async get<T>(endpoint: string): Promise<Result<T, ApiError>> {
    return this.requestWithRetry('GET', endpoint);
  }

  async post<T>(endpoint: string, data: any): Promise<Result<T, ApiError>> {
    return this.requestWithRetry('POST', endpoint, data);
  }

  private async requestWithRetry<T>(
    method: string,
    endpoint: string,
    data?: any,
    attempt = 1
  ): Promise<Result<T, ApiError>> {
    const result = await this.makeRequest<T>(method, endpoint, data);
    
    return result.match(
      // Success - return as is
      value => Result.ok(value),
      
      // Error - retry if appropriate
      error => {
        if (this.shouldRetry(error, attempt)) {
          console.log(`Retrying request (${attempt}/${this.maxRetries})...`);
          return this.requestWithRetry(method, endpoint, data, attempt + 1);
        }
        return Result.fail(error);
      }
    );
  }

  private async makeRequest<T>(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<Result<T, ApiError>> {
    return Result.wrap(async () => {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw {
          name: 'ApiError',
          message: errorBody.message || response.statusText,
          status: response.status,
          code: errorBody.code || 'UNKNOWN_ERROR'
        } as ApiError;
      }

      return response.json();
    });
  }

  private shouldRetry(error: ApiError, attempt: number): boolean {
    if (attempt >= this.maxRetries) return false;
    
    // Retry on server errors and network issues
    return error.status >= 500 || error.status === 429;
  }
}
```

## Validation with API Responses

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

async function fetchAndValidateUser(id: string): Promise<Result<User, string>> {
  const apiResult = await fetchUser(id);
  
  return apiResult
    .flatMap(user => 
      Result.ok(user).unwrapThrowError(
        // Validate required fields
        user => user.id || 'Missing user ID',
        user => user.name || 'Missing user name',
        user => user.email || 'Missing user email',
        
        // Validate formats
        user => user.email.includes('@') || 'Invalid email format',
        
        // Business rules
        user => user.isActive || 'User account is suspended'
      )
    );
}
```

## Combining Multiple API Calls

```typescript
interface UserProfile {
  user: User;
  settings: UserSettings;
  permissions: Permission[];
}

async function fetchUserProfile(userId: string): Promise<Result<UserProfile, ApiError>> {
  const client = new ApiClient('/api');
  
  // Fetch all data in parallel
  const [userResult, settingsResult, permissionsResult] = await Promise.all([
    client.get<User>(`/users/${userId}`),
    client.get<UserSettings>(`/users/${userId}/settings`),
    client.get<Permission[]>(`/users/${userId}/permissions`)
  ]);

  // Combine results using lift
  const combineProfile = Result.lift((
    user: User,
    settings: UserSettings,
    permissions: Permission[]
  ): UserProfile => ({
    user,
    settings,
    permissions
  }));

  return combineProfile(userResult, settingsResult, permissionsResult);
}
```

## Error Categorization

```typescript
enum ErrorCategory {
  NETWORK = 'NETWORK',
  CLIENT = 'CLIENT',
  SERVER = 'SERVER',
  VALIDATION = 'VALIDATION'
}

interface CategorizedError extends Error {
  category: ErrorCategory;
  status?: number;
  retryable: boolean;
}

function categorizeApiError(error: ApiError): CategorizedError {
  let category: ErrorCategory;
  let retryable = false;

  if (!error.status) {
    category = ErrorCategory.NETWORK;
    retryable = true;
  } else if (error.status >= 400 && error.status < 500) {
    category = ErrorCategory.CLIENT;
    retryable = error.status === 429; // Rate limiting
  } else if (error.status >= 500) {
    category = ErrorCategory.SERVER;
    retryable = true;
  } else {
    category = ErrorCategory.VALIDATION;
    retryable = false;
  }

  return {
    name: 'CategorizedError',
    message: error.message,
    category,
    status: error.status,
    retryable
  };
}

// Usage
const result = await fetchUser('123');
result.onFailure(error => {
  const categorized = categorizeApiError(error);
  
  console.log(`Error category: ${categorized.category}`);
  console.log(`Retryable: ${categorized.retryable}`);
  
  // Log to appropriate service based on category
  if (categorized.category === ErrorCategory.SERVER) {
    logToErrorService(categorized);
  }
});
```

## Authentication Integration

```typescript
class AuthenticatedApiClient extends ApiClient {
  private token: string | null = null;

  async login(credentials: LoginCredentials): Promise<Result<AuthToken, ApiError>> {
    const result = await this.post<AuthToken>('/auth/login', credentials);
    
    result.onSuccess(auth => {
      this.token = auth.token;
    });
    
    return result;
  }

  protected async makeRequest<T>(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<Result<T, ApiError>> {
    return Result.wrap(async () => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.token) {
        headers.Authorization = `Bearer ${this.token}`;
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });

      if (response.status === 401) {
        this.token = null; // Clear invalid token
        throw {
          name: 'ApiError',
          message: 'Authentication required',
          status: 401,
          code: 'UNAUTHORIZED'
        } as ApiError;
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw {
          name: 'ApiError',
          message: errorBody.message || response.statusText,
          status: response.status,
          code: errorBody.code || 'UNKNOWN_ERROR'
        } as ApiError;
      }

      return response.json();
    });
  }
}
```

## Testing API Integration

```typescript
describe('API Client', () => {
  let client: ApiClient;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    client = new ApiClient('https://api.example.com');
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  it('should handle successful responses', async () => {
    const userData = { id: '1', name: 'John' };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(userData)
    } as Response);

    const result = await client.get<User>('/users/1');
    
    expect(result.isOk).toBe(true);
    expect(result.value).toEqual(userData);
  });

  it('should handle 404 errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.resolve({ message: 'User not found' })
    } as Response);

    const result = await client.get<User>('/users/999');
    
    expect(result.isOk).toBe(false);
    expect(result.error?.status).toBe(404);
    expect(result.error?.message).toBe('User not found');
  });

  it('should retry on server errors', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response)
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: '1', name: 'John' })
      } as Response);

    const result = await client.get<User>('/users/1');
    
    expect(result.isOk).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
```

## Key Takeaways

1. **Use specific error types** - Create `ApiError` interfaces with status codes and error codes
2. **Handle different status codes** - 4xx vs 5xx errors need different handling
3. **Implement retry logic** - Retry on server errors and network issues
4. **Validate responses** - Don't trust API responses, validate the data
5. **Categorize errors** - Group errors by type for appropriate handling
6. **Test thoroughly** - Mock API responses to test all error scenarios

This pattern gives you robust, type-safe API error handling that's easy to test and maintain!