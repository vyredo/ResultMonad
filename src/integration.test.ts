import { Result } from './index';

describe('Integration Tests', () => {
  describe('Real-world scenarios', () => {
    // Simulated API call
    async function fetchUser(id: string): Promise<Result<{ id: string; name: string }, Error>> {
      return Result.wrap(async () => {
        if (id === 'invalid') {
          throw new Error('User not found');
        }
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 10));
        return { id, name: 'John Doe' };
      });
    }

    // Simulated validation
    function validateEmail(email: string): Result<string, Error> {
      if (!email.includes('@')) {
        return Result.fail('Invalid email format');
      }
      if (email.length < 5) {
        return Result.fail('Email too short');
      }
      return Result.ok(email.toLowerCase());
    }

    it('should handle async API calls with error handling', async () => {
      const successResult = await fetchUser('123');
      expect(successResult.isOk).toBe(true);
      expect(successResult.value).toEqual({ id: '123', name: 'John Doe' });

      const errorResult = await fetchUser('invalid');
      expect(errorResult.isOk).toBe(false);
      expect(errorResult.error?.message).toBe('User not found');
    });

    it('should chain multiple async operations', async () => {
      const result = await fetchUser('123')
        .then(r => r.flatMap(user => 
          Result.wrap(async () => {
            // Simulate fetching user details
            await new Promise(resolve => setTimeout(resolve, 10));
            return { ...user, email: 'john@example.com' };
          })
        ));

      expect(result.isOk).toBe(true);
      expect(result.value).toEqual({
        id: '123',
        name: 'John Doe',
        email: 'john@example.com'
      });
    });

    it('should handle form validation pipeline', () => {
      interface FormData {
        email: string;
        age: number;
        username: string;
      }

      function validateAge(age: number): Result<number, Error> {
        if (age < 18) return Result.fail('Must be 18 or older');
        if (age > 120) return Result.fail('Invalid age');
        return Result.ok(age);
      }

      function validateUsername(username: string): Result<string, Error> {
        if (username.length < 3) return Result.fail('Username too short');
        if (!/^[a-zA-Z0-9_]+$/.test(username)) return Result.fail('Invalid username format');
        return Result.ok(username);
      }

      const validateForm = Result.lift((email: string, age: number, username: string): FormData => ({
        email,
        age,
        username
      }));

      // Valid form
      const validResult = validateForm(
        validateEmail('user@example.com'),
        validateAge(25),
        validateUsername('john_doe')
      );

      expect(validResult.isOk).toBe(true);
      expect(validResult.value).toEqual({
        email: 'user@example.com',
        age: 25,
        username: 'john_doe'
      });

      // Invalid form - email
      const invalidEmailResult = validateForm(
        validateEmail('invalid'),
        validateAge(25),
        validateUsername('john_doe')
      );

      expect(invalidEmailResult.isOk).toBe(false);
      expect(invalidEmailResult.error?.message).toBe('Invalid email format');

      // Invalid form - age
      const invalidAgeResult = validateForm(
        validateEmail('user@example.com'),
        validateAge(15),
        validateUsername('john_doe')
      );

      expect(invalidAgeResult.isOk).toBe(false);
      expect(invalidAgeResult.error?.message).toBe('Must be 18 or older');
    });

    it('should handle database transaction pattern', async () => {
      // Simulated database operations
      class Database {
        async beginTransaction(): Promise<Result<{ id: string }, Error>> {
          return Result.ok({ id: 'tx123' });
        }

        async insertUser(tx: { id: string }, user: any): Promise<Result<number, Error>> {
          if (!user.name) return Result.fail('Name is required');
          return Result.ok(1);
        }

        async insertProfile(tx: { id: string }, profile: any): Promise<Result<number, Error>> {
          if (!profile.userId) return Result.fail('User ID is required');
          return Result.ok(1);
        }

        async commit(tx: { id: string }): Promise<Result<void, Error>> {
          return Result.ok(undefined);
        }

        async rollback(tx: { id: string }): Promise<Result<void, Error>> {
          return Result.ok(undefined);
        }
      }

      const db = new Database();

      // Transaction helper
      async function createUserWithProfile(userData: any, profileData: any) {
        const txResult = await db.beginTransaction();
        
        if (!txResult.isOk) {
          return txResult;
        }

        const tx = txResult.value;

        const userResult = await db.insertUser(tx, userData);
        if (!userResult.isOk) {
          await db.rollback(tx);
          return userResult;
        }

        const profileResult = await db.insertProfile(tx, { 
          ...profileData, 
          userId: userResult.value 
        });
        
        if (!profileResult.isOk) {
          await db.rollback(tx);
          return profileResult;
        }

        const commitResult = await db.commit(tx);
        if (!commitResult.isOk) {
          return commitResult;
        }

        return Result.ok({ userId: userResult.value, profileId: profileResult.value });
      }

      // Success case
      const successResult = await createUserWithProfile(
        { name: 'John' },
        { bio: 'Developer' }
      );
      expect(successResult.isOk).toBe(true);
      expect(successResult.value).toEqual({ userId: 1, profileId: 1 });

      // Failure case
      const failureResult = await createUserWithProfile(
        { name: '' }, // Invalid
        { bio: 'Developer' }
      );
      expect(failureResult.isOk).toBe(false);
      expect(failureResult.error?.message).toBe('Name is required');
    });

    it('should handle retry logic with Results', async () => {
      let attempts = 0;
      
      async function unreliableOperation(): Promise<Result<string, Error>> {
        attempts++;
        if (attempts < 3) {
          return Result.fail('Temporary failure');
        }
        return Result.ok('Success after retries');
      }

      async function retryOperation<T>(
        operation: () => Promise<Result<T, Error>>,
        maxRetries: number = 3
      ): Promise<Result<T, Error>> {
        let lastError: Error | undefined;
        
        for (let i = 0; i < maxRetries; i++) {
          const result = await operation();
          if (result.isOk) {
            return result;
          }
          lastError = result.error;
          await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
        }
        
        return Result.fail(lastError || new Error('Max retries exceeded'));
      }

      const result = await retryOperation(unreliableOperation);
      expect(result.isOk).toBe(true);
      expect(result.value).toBe('Success after retries');
      expect(attempts).toBe(3);
    });

    it('should handle parallel operations with Result.all pattern', async () => {
      // Custom Result.all implementation
      async function resultAll<T>(
        results: Promise<Result<T, Error>>[]
      ): Promise<Result<T[], Error>> {
        const settled = await Promise.all(results);
        
        for (const result of settled) {
          if (!result.isOk) {
            return Result.fail(result.error!);
          }
        }
        
        return Result.ok(settled.map(r => r.value!));
      }

      // Simulated parallel API calls
      const userPromises = ['1', '2', '3'].map(id => fetchUser(id));
      
      const result = await resultAll(userPromises);
      expect(result.isOk).toBe(true);
      expect(result.value).toHaveLength(3);
      expect(result.value![0]).toEqual({ id: '1', name: 'John Doe' });
    });
  });

  describe('Error propagation patterns', () => {
    it('should maintain error context through transformations', () => {
      class ValidationError extends Error {
        constructor(public field: string, message: string) {
          super(message);
          this.name = 'ValidationError';
        }
      }

      const result = Result.fail<number, ValidationError>(
        new ValidationError('age', 'Must be positive')
      )
        .map(x => x * 2)
        .flatMap(x => Result.ok(x + 1))
        .map(x => x.toString());

      expect(result.isOk).toBe(false);
      expect(result.error).toBeInstanceOf(ValidationError);
      expect(result.error?.field).toBe('age');
    });

    it('should handle nested Result unwrapping', () => {
      const nestedResult = Result.ok(Result.ok(Result.ok(42)));
      
      // Manual unwrapping
      const unwrapped = nestedResult
        .flatMap(r1 => r1)
        .flatMap(r2 => r2);
      
      expect(unwrapped.isOk).toBe(true);
      expect(unwrapped.value).toBe(42);
    });
  });

  describe('Performance considerations', () => {
    it('should handle large arrays efficiently', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      
      const start = Date.now();
      const result = Result.ok(largeArray)
        .map(arr => arr.filter(x => x % 2 === 0))
        .map(arr => arr.map(x => x * 2))
        .map(arr => arr.reduce((sum, x) => sum + x, 0));
      const end = Date.now();
      
      expect(result.isOk).toBe(true);
      expect(typeof result.value).toBe('number');
      expect(end - start).toBeLessThan(100); // Should be fast
    });

    it('should not create unnecessary intermediate objects', () => {
      let transformCount = 0;
      
      const result = Result.fail<number>('Error')
        .map(x => {
          transformCount++;
          return x * 2;
        })
        .map(x => {
          transformCount++;
          return x + 1;
        })
        .map(x => {
          transformCount++;
          return x.toString();
        });
      
      expect(transformCount).toBe(0); // No transforms should run on error
      expect(result.isOk).toBe(false);
    });
  });
});