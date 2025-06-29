import { Result, Ok, ReturnResult, HttpErrorForResult } from './index';

describe('Result', () => {
  describe('Result.ok', () => {
    it('should create a successful result', () => {
      const result = Result.ok(42);
      expect(result.isOk).toBe(true);
      expect(result.value).toBe(42);
      expect(result.error).toBeUndefined();
    });

    it('should handle different types', () => {
      const stringResult = Result.ok('hello');
      const objectResult = Result.ok({ name: 'test' });
      const arrayResult = Result.ok([1, 2, 3]);

      expect(stringResult.value).toBe('hello');
      expect(objectResult.value).toEqual({ name: 'test' });
      expect(arrayResult.value).toEqual([1, 2, 3]);
    });

    it('should work with Ok alias', () => {
      const result = Ok(42);
      expect(result.isOk).toBe(true);
      expect(result.value).toBe(42);
    });
  });

  describe('Result.fail', () => {
    it('should create a failed result with Error', () => {
      const error = new Error('Something went wrong');
      const result = Result.fail<number>(error);
      
      expect(result.isOk).toBe(false);
      expect(result.error).toBe(error);
      expect(result.value).toBeUndefined();
    });

    it('should create a failed result with string', () => {
      const result = Result.fail<number>('Error message');
      
      expect(result.isOk).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Error message');
    });

    it('should handle custom error types', () => {
      class CustomError extends Error {
        constructor(public code: number, message: string) {
          super(message);
        }
      }

      const error = new CustomError(404, 'Not found');
      const result = Result.fail<string, CustomError>(error);
      
      expect(result.error).toBeInstanceOf(CustomError);
      expect(result.error?.code).toBe(404);
    });
  });

  describe('Result.fromPromise', () => {
    it('should handle resolved promises', async () => {
      const promise = Promise.resolve(42);
      const result = await Result.fromPromise(promise, (e) => new Error(String(e)));
      
      expect(result.isOk).toBe(true);
      expect(result.value).toBe(42);
    });

    it('should handle rejected promises', async () => {
      const promise = Promise.reject('Error');
      const result = await Result.fromPromise(
        promise,
        (e) => new Error(`Failed: ${e}`)
      );
      
      expect(result.isOk).toBe(false);
      expect(result.error?.message).toBe('Failed: Error');
    });
  });

  describe('Result.lift', () => {
    it('should lift a function to work with Results', () => {
      const add = (a: number, b: number) => a + b;
      const liftedAdd = Result.lift(add);
      
      const result = liftedAdd(Result.ok(2), Result.ok(3));
      expect(result.isOk).toBe(true);
      expect(result.value).toBe(5);
    });

    it('should propagate first failure', () => {
      const add = (a: number, b: number) => a + b;
      const liftedAdd = Result.lift(add);
      
      const error1 = new Error('First error');
      const error2 = new Error('Second error');
      
      const result = liftedAdd(
        Result.fail<number>(error1),
        Result.fail<number>(error2)
      );
      
      expect(result.isOk).toBe(false);
      expect(result.error).toBe(error1);
    });

    it('should work with multiple arguments', () => {
      const sum = (a: number, b: number, c: number) => a + b + c;
      const liftedSum = Result.lift(sum);
      
      const result = liftedSum(
        Result.ok(1),
        Result.ok(2),
        Result.ok(3)
      );
      
      expect(result.isOk).toBe(true);
      expect(result.value).toBe(6);
    });
  });

  describe('Result.wrap', () => {
    it('should wrap synchronous functions', () => {
      const result = Result.wrap(() => 42);
      expect(result.isOk).toBe(true);
      expect(result.value).toBe(42);
    });

    it('should catch synchronous errors', () => {
      const result = Result.wrap(() => {
        throw new Error('Sync error');
      });
      
      expect(result.isOk).toBe(false);
      expect(result.error?.message).toBe('Sync error');
    });

    it('should wrap async functions', async () => {
      const result = await Result.wrap(async () => 42);
      expect(result.isOk).toBe(true);
      expect(result.value).toBe(42);
    });

    it('should catch async errors', async () => {
      const result = await Result.wrap(async () => {
        throw new Error('Async error');
      });
      
      expect(result.isOk).toBe(false);
      expect(result.error?.message).toBe('Async error');
    });

    it('should flatten nested Results', () => {
      const result = Result.wrap(() => Result.ok(42));
      expect(result.isOk).toBe(true);
      expect(result.value).toBe(42);
    });

    it('should handle non-Error throws', () => {
      const result = Result.wrap(() => {
        throw 'String error';
      });
      
      expect(result.isOk).toBe(false);
      expect(result.error?.message).toBe('String error');
    });
  });

  describe('map', () => {
    it('should transform success values', () => {
      const result = Result.ok(5).map(x => x * 2);
      expect(result.isOk).toBe(true);
      expect(result.value).toBe(10);
    });

    it('should pass through errors', () => {
      const error = new Error('test');
      const result = Result.fail<number>(error).map(x => x * 2);
      expect(result.isOk).toBe(false);
      expect(result.error).toBe(error);
    });

    it('should chain multiple maps', () => {
      const result = Result.ok(2)
        .map(x => x * 2)
        .map(x => x + 1)
        .map(x => x.toString());
      
      expect(result.isOk).toBe(true);
      expect(result.value).toBe('5');
    });
  });

  describe('flatMap', () => {
    it('should chain Result-returning functions', () => {
      const result = Result.ok(10).flatMap(x => 
        x > 0 ? Result.ok(x / 2) : Result.fail('Negative')
      );
      
      expect(result.isOk).toBe(true);
      expect(result.value).toBe(5);
    });

    it('should propagate errors from original', () => {
      const error = new Error('Original error');
      const result = Result.fail<number>(error).flatMap(x => Result.ok(x * 2));
      
      expect(result.isOk).toBe(false);
      expect(result.error).toBe(error);
    });

    it('should propagate errors from flatMap function', () => {
      const result = Result.ok(10).flatMap(() => 
        Result.fail<number>('FlatMap error')
      );
      
      expect(result.isOk).toBe(false);
      expect(result.error?.message).toBe('FlatMap error');
    });
  });

  describe('match', () => {
    it('should execute onOk for success', () => {
      const result = Result.ok(42).match(
        value => `Success: ${value}`,
        error => `Error: ${error.message}`
      );
      
      expect(result).toBe('Success: 42');
    });

    it('should execute onFail for errors', () => {
      const result = Result.fail<number>('Test error').match(
        value => `Success: ${value}`,
        error => `Error: ${error.message}`
      );
      
      expect(result).toBe('Error: Test error');
    });
  });

  describe('unwrap methods', () => {
    describe('unwrap', () => {
      it('should return value for success', () => {
        const value = Result.ok(42).unwrap();
        expect(value).toBe(42);
      });

      it('should throw for errors', () => {
        expect(() => Result.fail<number>('Error').unwrap()).toThrow();
      });
    });

    describe('unwrapSafe', () => {
      it('should return value for success', () => {
        const value = Result.ok(42).unwrapSafe();
        expect(value).toBe(42);
      });

      it('should return null for errors', () => {
        const value = Result.fail<number>('Error').unwrapSafe();
        expect(value).toBeNull();
      });
    });

    describe('unwrapOrElse', () => {
      it('should return value for success', () => {
        const value = Result.ok(42).unwrapOrElse(0);
        expect(value).toBe(42);
      });

      it('should return default for errors', () => {
        const value = Result.fail<number>('Error').unwrapOrElse(0);
        expect(value).toBe(0);
      });
    });

    describe('unwrapReturnError', () => {
      it('should return value for success', () => {
        const result = Result.ok(42).unwrapReturnError();
        expect(result).toBe(42);
      });

      it('should return error for failures', () => {
        const error = new Error('Test');
        const result = Result.fail<number>(error).unwrapReturnError();
        expect(result).toBe(error);
      });
    });

    describe('unwrapThrowError', () => {
      it('should return value when validation passes', () => {
        const value = Result.ok(42).unwrapThrowError(
          v => v! > 0 || 'Must be positive'
        );
        expect(value).toBe(42);
      });

      it('should throw when validation fails', () => {
        expect(() => 
          Result.ok(-5).unwrapThrowError(
            v => v! > 0 || 'Must be positive'
          )
        ).toThrow('Must be positive');
      });

      it('should escape validation on true', () => {
        const value = Result.ok(42).unwrapThrowError(
          () => true,
          () => 'This should not run'
        );
        expect(value).toBe(42);
      });

      it('should continue on false', () => {
        const value = Result.ok(42).unwrapThrowError(
          () => false,
          v => v === 42 || 'Not 42'
        );
        expect(value).toBe(42);
      });

      it('should throw custom objects', () => {
        const customError = { code: 'CUSTOM', message: 'Custom error' };
        expect(() => 
          Result.ok(42).unwrapThrowError(() => customError)
        ).toThrow(customError);
      });
    });
  });

  describe('side effects', () => {
    describe('onSuccess', () => {
      it('should execute callback for success', () => {
        const callback = jest.fn();
        const result = Result.ok(42).onSuccess(callback);
        
        expect(callback).toHaveBeenCalledWith(42);
        expect(result.value).toBe(42); // Should return same result
      });

      it('should not execute callback for errors', () => {
        const callback = jest.fn();
        Result.fail<number>('Error').onSuccess(callback);
        
        expect(callback).not.toHaveBeenCalled();
      });
    });

    describe('onFailure', () => {
      it('should execute callback for errors', () => {
        const callback = jest.fn();
        const error = new Error('Test');
        const result = Result.fail<number>(error).onFailure(callback);
        
        expect(callback).toHaveBeenCalledWith(error);
        expect(result.error).toBe(error); // Should return same result
      });

      it('should not execute callback for success', () => {
        const callback = jest.fn();
        Result.ok(42).onFailure(callback);
        
        expect(callback).not.toHaveBeenCalled();
      });
    });
  });

  describe('ap (applicative)', () => {
    it('should apply wrapped function to wrapped value', () => {
      const fn = Result.ok((x: number) => x * 2);
      const value = Result.ok(5);
      const result = fn.ap(value);
      
      expect(result.isOk).toBe(true);
      expect(result.value).toBe(10);
    });

    it('should propagate function errors', () => {
      const error = new Error('Function error');
      const fn = Result.fail<(x: number) => number>(error);
      const value = Result.ok(5);
      const result = fn.ap(value);
      
      expect(result.isOk).toBe(false);
      expect(result.error).toBe(error);
    });

    it('should propagate value errors', () => {
      const fn = Result.ok((x: number) => x * 2);
      const error = new Error('Value error');
      const value = Result.fail<number>(error);
      const result = fn.ap(value);
      
      expect(result.isOk).toBe(false);
      expect(result.error).toBe(error);
    });
  });

  describe('HttpErrorForResult', () => {
    it('should create HTTP error with status and message', () => {
      const error = new HttpErrorForResult(404, 'Not found');
      expect(error.status).toBe(404);
      expect(error.error).toBe('Not found');
    });
  });

  describe('Type safety', () => {
    it('should exclude Error types from success values', () => {
      // This should compile
      const result: ReturnResult<string> = Result.ok('hello');
      expect(result.value).toBe('hello');
      
      // Error values should not be allowed in Result.ok
      // This is a compile-time check, runtime will still work
      const errorResult = Result.ok(new Error('test'));
      expect(errorResult.value).toBeInstanceOf(Error);
    });

    it('should handle union types correctly', () => {
      type UserResult = ReturnResult<{ id: number; name: string }, Error>;
      
      const success: UserResult = Result.ok({ id: 1, name: 'John' });
      const failure: UserResult = Result.fail(new Error('User not found'));
      
      expect(success.isOk).toBe(true);
      expect(failure.isOk).toBe(false);
    });
  });
});