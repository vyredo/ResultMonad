export type ResultFail<T, E extends Error> = Omit<Result<T, E>, "value"> & {
  readonly isOk: false;
  readonly error: E;
};

export type ResultSuccess<T> = Omit<Result<T, any>, "error"> & {
  readonly isOk: true;
  readonly value: ExcludeUnknownAndError<T>;
};

export type ReturnResult<T, E extends Error = Error> =
  | ResultSuccess<ExcludeUnknownAndError<T>>
  | ResultFail<T, E>;

export class HttpErrorForResult {
  constructor(public status: number, public error: string) {}
}

// Type helper to recursively unwrap nested Results
type UnwrapResult<T> = T extends ReturnResult<infer U> ? UnwrapResult<U> : T;
type ExcludeUnknownAndError<T> = T extends unknown
  ? unknown extends T
    ? never
    : T extends Error
    ? never
    : T
  : never;

export class Result<T, E extends Error = Error> {
  constructor(
    readonly isOk: boolean,
    readonly error?: E,
    readonly value?: ExcludeUnknownAndError<T>
  ) {}

  /**
   * Creates a successful Result containing a value.
   * 
   * Use this factory method to wrap successful values in a Result type.
   * The value will be available through the `value` property and `isOk` will be true.
   * 
   * @param value - The success value to wrap
   * @returns {ResultSuccess<T>} A successful Result containing the value
   * 
   * @see {@link fail} For creating failed Results
   * @see {@link wrap} For automatic success/failure handling
   * 
   * @example
   * const result = Result.ok(42);
   * // result: { isOk: true, value: 42, error: undefined }
   * 
   * @example
   * // With complex types
   * const userResult = Result.ok({ id: 1, name: 'John' });
   * console.log(userResult.value); // { id: 1, name: 'John' }
   */
  static ok<T>(value: T): ResultSuccess<ExcludeUnknownAndError<T>> {
    return new Result<T, any>(true, undefined, value as any) as ResultSuccess<
      ExcludeUnknownAndError<T>
    >;
  }

  /**
   * Creates a failed Result containing an error.
   * 
   * Use this factory method to wrap errors in a Result type. String errors
   * are automatically converted to Error objects for consistency.
   * 
   * @param errorOrMessage - Error object or string message to wrap
   * @returns {ResultFail<T, E>} A failed Result containing the error
   * 
   * @see {@link ok} For creating successful Results
   * @see {@link wrap} For automatic success/failure handling
   * 
   * @example
   * const result = Result.fail<number>('Something went wrong');
   * // result: { isOk: false, error: Error('Something went wrong'), value: undefined }
   * 
   * @example
   * // With custom Error objects
   * const customError = new TypeError('Invalid input');
   * const result = Result.fail<string>(customError);
   * console.log(result.error); // TypeError: Invalid input
   */
  static fail<T = unknown, E extends Error = Error>(
    errorOrMessage: E | string
  ): ResultFail<T, E> {
    if (typeof errorOrMessage === "string") {
      return new Result<T, E>(
        false,
        new Error(errorOrMessage) as E,
        undefined
      ) as ResultFail<T, E>;
    }

    return new Result<T, E>(false, errorOrMessage, undefined) as ResultFail<T, E>;
  }

  /**
   * Wraps a Promise, returning a Result.ok if resolved, or Result.fail if rejected.
   * 
   * This method provides a clean way to convert Promise-based APIs into Result-based
   * error handling. The error mapper function allows you to transform rejection values
   * into structured error types.
   * 
   * @param promise - The Promise to wrap and convert to a Result
   * @param errorMapper - Function to transform rejection values into Error objects
   * @returns {Promise<Result<T, E>>} Promise that resolves to a Result
   * 
   * @see {@link wrap} For synchronous operations or functions
   * 
   * @example
   * const result = await Result.fromPromise(
   *   fetchUser(id),
   *   error => new Error(`Failed to fetch user: ${error}`)
   * );
   * // result: Result.ok(user) or Result.fail(Error)
   * 
   * @example
   * // With custom error mapping
   * const apiResult = await Result.fromPromise(
   *   fetch('/api/data'),
   *   error => ({
   *     name: 'NetworkError',
   *     message: `API request failed: ${error}`,
   *     timestamp: new Date().toISOString()
   *   } as Error)
   * );
   */
  static async fromPromise<T, E extends Error>(
    promise: Promise<T>,
    errorMapper: (rejectionValue: unknown) => E
  ) {
    try {
      const resolvedValue = await promise;
      return Result.ok<T>(resolvedValue);
    } catch (rejectionValue) {
      return Result.fail<T, E>(errorMapper(rejectionValue));
    }
  }

  /**
   * Lifts a function to operate on Result arguments, propagating the first failure.
   * 
   * This method enables combining multiple Results using a regular function.
   * If any input Result is a failure, the first failure is returned immediately.
   * Only if all inputs are successful will the function be applied.
   * 
   * @param targetFunction - Function to lift to work with Results
   * @returns {Function} Lifted function that accepts and returns Results
   * 
   * @see {@link ap} For applying Result-wrapped functions
   * @see {@link wrap} For wrapping single operations
   * 
   * @example
   * const add = (a: number, b: number) => a + b;
   * const liftedAdd = Result.lift(add);
   * const r1 = Result.ok(1);
   * const r2 = Result.ok(2);
   * const sum = liftedAdd(r1, r2); // Result.ok(3)
   * 
   * @example
   * // Failure propagation
   * const r1 = Result.fail<number>('First error');
   * const r2 = Result.fail<number>('Second error');
   * const sum = liftedAdd(r1, r2); // Result.fail('First error')
   * 
   * @example
   * // Complex data combination
   * const createUser = (name: string, age: number, email: string) => ({ name, age, email });
   * const liftedCreateUser = Result.lift(createUser);
   * 
   * const user = liftedCreateUser(
   *   validateName(inputName),
   *   validateAge(inputAge), 
   *   validateEmail(inputEmail)
   * ); // Result.ok(user) only if all validations pass
   */
  static lift<Args extends any[], R>(targetFunction: (...args: Args) => R) {
    return (...resultArguments: { [K in keyof Args]: Result<Args[K], any> }) => {
      // Check if any result is a failure
      const firstFailedResult = resultArguments.find((result) => !result.isOk);
      if (firstFailedResult !== undefined) {
        return Result.fail(firstFailedResult.error!);
      }

      // If all results are successful, apply the function
      const unwrappedValues = resultArguments.map((result) => result.value) as Args;
      return Result.ok(targetFunction(...unwrappedValues));
    };
  }

  /**
   * Automatically converts thrown errors to Result.fail and successful returns to Result.ok.
   *
   * This method handles both synchronous and asynchronous operations, providing a clean
   * way to convert traditional try-catch patterns into Result-based error handling.
   * 
   * **Key Features:**
   * - Catches all thrown errors and converts to Result.fail
   * - Flattens nested Results (prevents Result<Result<T>>)
   * - Works with both sync and async functions
   * - Preserves stack traces in error cases
   *
   * IMPORTANT: Due to TypeScript decorator limitations, you need to manually update the method signature:
   * - Change return type from T to ReturnResult<T>
   * - Change return type from Promise<T> to Promise<ReturnResult<T>>
   * - Remove manual Result.ok() and Result.fail() calls - just return plain values or throw errors
   *
   * @param operation - Function to execute and wrap in Result handling
   * @returns {Result<T>} Success Result with return value, or failure Result with caught error
   * 
   * @see {@link fromPromise} For Promise-specific error handling
   * @see {@link lift} For combining multiple Results
   * 
   * @example
   * // Synchronous operation
   * const result = Result.wrap(() => JSON.parse(jsonString));
   * // Returns: Result.ok(parsed) or Result.fail(Error('Unexpected token...'))
   * 
   * @example
   * // Asynchronous operation  
   * const userResult = await Result.wrap(async () => {
   *   const response = await fetch('/api/user');
   *   if (!response.ok) throw new Error('API request failed');
   *   return response.json();
   * });
   * 
   * @example
   * // Automatic Result flattening
   * const result = Result.wrap(() => Result.ok(42)); // Result<number>, not Result<Result<number>>
   * 
   * @example
   * class UserService {
   *   async findUser(id: string): Promise<ReturnResult<User>> { // <- Note: ReturnResult<User>
   *     return Result.wrap(async () => {
   *          // This method can throw errors, but they'll be caught and converted to Result.fail
   *          const user = await database.findUser(id);
   *          if (!user) {
   *              throw new Error('User not found'); // <- Throw errors directly
   *          }
   *          return user; // <- Return plain values, it will be wrapped in Result.ok
   *     })
   *   }
   * }
   */
  static wrap<T, E extends Error = Error>(
    operation: () => Promise<ReturnResult<T, E>>
  ): Promise<ReturnResult<T, Error>>;
  static wrap<T extends ReturnResult<any, any>>(operation: () => T): T;
  static wrap<T>(
    operation: () => Promise<T>
  ): Promise<ReturnResult<UnwrapResult<T>, Error>>;
  static wrap<T>(operation: () => T): ReturnResult<UnwrapResult<T>, Error>;
  static wrap<T>(operation: () => T | Promise<T>) {
    const convertToFailedResult = (thrownValue: unknown) =>
      isResultObj(thrownValue)
        ? thrownValue
        : Result.fail(thrownValue instanceof Error ? thrownValue : new Error(String(thrownValue)));
    try {
      const executionResult = operation();

      if (executionResult instanceof Promise) {
        return (
          executionResult
            // If the resolved value is already a Result, return it as-is (flattening)
            .then((resolvedValue) => (isResultObj(resolvedValue) ? resolvedValue : Result.ok(resolvedValue)))
            .catch((thrownValue) => convertToFailedResult(thrownValue))
        );
      }

      // Handle synchronous results
      if (isResultObj(executionResult)) return executionResult as T;
      return Result.ok(executionResult as T);
    } catch (thrownValue: any) {
      return convertToFailedResult(thrownValue);
    }
  }

  /**
   * Applies a Result-wrapped function to another Result, propagating errors.
   * 
   * This method implements the Applicative functor pattern, allowing you to apply
   * functions that are themselves wrapped in Results. If either the function or
   * the value is an error, the error is propagated.
   * 
   * @param otherResult - Result containing the value to apply the function to
   * @returns {Result<B>} Result of applying the function, or the first error encountered
   * 
   * @see {@link lift} For applying regular functions to multiple Results
   * @see {@link flatMap} For chaining Result-returning operations
   * 
   * @example
   * const fn = Result.ok((x: number) => x * 2);
   * const val = Result.ok(5);
   * const result = fn.ap(val); // Result.ok(10)
   * 
   * @example
   * // Error propagation
   * const fn = Result.fail<(x: number) => number>('Function error');
   * const val = Result.ok(5);
   * const result = fn.ap(val); // Result.fail('Function error')
   */
  ap<A, B>(this: Result<(a: A) => B, E>, otherResult: Result<A, E>) {
    if (this.isOk && otherResult.isOk) {
      return Result.ok(this.value!(otherResult.value!));
    }
    return this.isOk ? Result.fail(otherResult.error!) : Result.fail(this.error!);
  }

  /**
   * Maps a function over a Result value if successful.
   * 
   * This method transforms the success value using the provided function.
   * If the Result is a failure, the mapping function is not called and the
   * error is propagated unchanged.
   * 
   * @param mappingFunction - Function to transform the success value
   * @returns {Result<U>} New Result with transformed value or original error
   * 
   * @see {@link flatMap} For transformations that return Results
   * @see {@link match} For handling both success and failure cases
   * 
   * @example
   * const result = Result.ok(3).fmap(x => x + 1); // Result.ok(4)
   * 
   * @example
   * // Chaining transformations
   * const result = Result.ok(2)
   *   .fmap(x => x * 2)    // Result.ok(4)
   *   .fmap(x => x + 1)    // Result.ok(5)
   *   .fmap(x => `Value: ${x}`); // Result.ok('Value: 5')
   * 
   * @example
   * // Error case - function not called
   * const failed = Result.fail<number>('Error');
   * const result = failed.fmap(x => x * 2); // Result.fail('Error')
   */
  fmap<U>(mappingFunction: (value: ExcludeUnknownAndError<T>) => U) {
    return this.isOk ? Result.ok(mappingFunction(this.value!)) as ResultSuccess<U> : Result.fail(this.error!);
  }

  /**
   * Chains computations that return Results, propagating errors.
   * 
   * This method implements the Monad pattern, allowing you to chain operations
   * that might fail. If the current Result is a failure, the chain function
   * is not called and the error is propagated.
   * 
   * @param chainFunction - Function that takes the success value and returns a new Result
   * @returns {Result<U>} Result from the chain function, or original error
   * 
   * @see {@link fmap} For transformations that return plain values
   * @see {@link ap} For applying Result-wrapped functions
   * 
   * @example
   * const result = Result.ok(2).flatMap(x => Result.ok(x * 10)); // Result.ok(20)
   * 
   * @example
   * // Chaining operations that might fail
   * const parseAndValidate = (input: string) =>
   *   Result.wrap(() => JSON.parse(input))
   *     .flatMap(data => data.id ? Result.ok(data) : Result.fail('Missing ID'))
   *     .flatMap(data => data.id > 0 ? Result.ok(data) : Result.fail('Invalid ID'));
   * 
   * @example
   * // Error propagation stops the chain
   * const result = Result.fail<number>('Initial error')
   *   .flatMap(x => Result.ok(x * 2)); // Result.fail('Initial error')
   */
  flatMap<U>(chainFunction: (value: T) => Result<U, E>): Result<U, E> {
    return this.isOk ? chainFunction(this.value!) : Result.fail(this.error!);
  }

  /**
   * Pattern-matching: executes onSuccess if successful, onFailure if failed.
   * 
   * This method provides exhaustive pattern matching, ensuring both success and
   * failure cases are handled. TypeScript will enforce that both callbacks return
   * the same type, making this safer than if-else chains.
   *
   * @param onSuccess - Function to call with the success value
   * @param onFailure - Function to call with the error
   * @returns {U} Result of whichever callback was executed
   * 
   * @see {@link unwrapOrElse} For value extraction with fallback
   * @see {@link onSuccess} and {@link onFailure} For side effects without transformation
   * 
   * @example
   * // Simple value transformation
   * const message = result.match(
   *   value => `Success: ${value}`,
   *   error => `Error: ${error.message}`
   * );
   * 
   * @example
   * // HTTP response handling
   * const response = apiResult.match(
   *   data => ({ status: 200, body: data }),
   *   error => ({ status: 500, body: { error: error.message } })
   * );
   * 
   * @example
   * // Type-safe error handling with discriminated unions
   * interface Success { type: 'success'; data: User }
   * interface Failure { type: 'error'; message: string }
   * 
   * const outcome: Success | Failure = userResult.match(
   *   user => ({ type: 'success' as const, data: user }),
   *   error => ({ type: 'error' as const, message: error.message })
   * );
   */
  match<U>(onSuccess: (value: T) => U, onFailure: (error: E) => U) {
    return this.isOk ? onSuccess(this.value!) : onFailure(this.error!);
  }

  /**
   * Returns the value if successful, or null if failed.
   * 
   * This method provides a safe way to extract values without throwing exceptions.
   * Use this when you want to handle the null case explicitly in your code.
   * 
   * @returns {T | null} The success value, or null if the Result is a failure
   * 
   * @see {@link unwrap} For extraction that throws on failure
   * @see {@link unwrapOrElse} For extraction with custom fallback values
   * 
   * @example
   * const value = result.unwrapSafe();
   * if (value !== null) {
   *   console.log('Success:', value);
   * } else {
   *   console.log('Operation failed');
   * }
   * 
   * @example
   * // Null-safe chaining
   * const processedValue = result.unwrapSafe()?.toString().toUpperCase();
   */
  unwrapSafe(): ExcludeUnknownAndError<T> | null {
    return this.value! as ExcludeUnknownAndError<T> | null;
  }

  /**
   * Returns the value if successful, or throws if failed.
   * 
   * Use this when you're confident the Result contains a success value,
   * or when you want to let exceptions bubble up for error handling.
   * 
   * @throws {Error} When the Result contains an error
   * @returns {T} The success value
   * @see {@link unwrapSafe} For null-safe extraction
   * @see {@link unwrapOrElse} For extraction with fallback
   * 
   * @example
   * const result = Result.ok(42);
   * const value = result.unwrap(); // 42
   * 
   * @example
   * const failed = Result.fail<number>('Error');
   * const value = failed.unwrap(); // Throws: Error('Error')
   * 
   * @example
   * // Safe usage with type checking
   * if (result.isOk) {
   *   const value = result.unwrap(); // Safe, won't throw
   * }
   */
  unwrap(): ExcludeUnknownAndError<T> {
    if (!this.isOk) {
      throw new Error(this.error?.message || "Result is not Ok");
    }
    return this.value! as ExcludeUnknownAndError<T>;
  }

  /**
   * Returns the value if successful, or a default value if failed.
   * 
   * This method provides a safe way to extract values with a fallback.
   * The fallback value is only used if the Result is a failure.
   * 
   * @param fallbackValue - Value to return if the Result is a failure
   * @returns {T} The success value or the fallback value
   * 
   * @see {@link unwrap} For extraction that throws on failure
   * @see {@link unwrapSafe} For extraction that returns null on failure
   * 
   * @example
   * const value = result.unwrapOrElse(0);
   * // Returns the success value, or 0 if failed
   * 
   * @example
   * // With complex fallback values
   * const user = userResult.unwrapOrElse({ id: -1, name: 'Anonymous' });
   */
  unwrapOrElse(fallbackValue: T): T {
    return this.isOk && !this.error ? this.value! : fallbackValue;
  }

  /**
   * Returns the value if successful, or the error if failed.
   * 
   * This method allows you to get either the success value or the error object,
   * useful when you need to handle both cases but want the actual objects.
   * 
   * @returns {T | Error} The success value or the error object
   * 
   * @see {@link match} For transforming both success and failure cases
   * 
   * @example
   * const valOrErr = result.unwrapReturnError();
   * if (valOrErr instanceof Error) {
   *   console.error('Failed:', valOrErr.message);
   * } else {
   *   console.log('Success:', valOrErr);
   * }
   */
  unwrapReturnError() {
    if (this.isOk) return this.value as ExcludeUnknownAndError<T>;
    return this.error as Error;
  }

  /**
   * Validates the success value through a series of callbacks with flexible control flow.
   *
   * This method provides powerful validation chains with three control mechanisms:
   * - **Continue**: Return `false`, `null`, or `undefined` to proceed to next validation
   * - **Fail Fast**: Return `string` or `object` to throw an error immediately  
   * - **Escape**: Return `true` to bypass ALL remaining validations and return the value
   *
   * @param validationCallbacks - Functions that validate the value and control execution flow
   * @returns {T} The validated value if all checks pass or any callback returns `true`
   * @throws {Error} String returns are wrapped in Error objects
   * @throws {object} Object returns are thrown directly (for custom error types)
   * @throws {Error} Original Result error if no validations pass and Result was failed
   * 
   * @see {@link unwrap} For simple value extraction
   * @see {@link match} For pattern matching without validation
   * 
   * @example
   * // Basic validation chain
   * const user = userResult.unwrapThrowError(
   *   user => user?.isActive || 'User account is inactive',
   *   user => user?.verified || 'Email not verified',
   *   user => user?.hasPermission || 'Insufficient permissions'
   * );
   * 
   * @example  
   * // Early escape with business logic
   * const user = userResult.unwrapThrowError(
   *   user => user?.role === 'admin', // ✅ Admins bypass all other checks
   *   user => user?.subscription || 'Subscription required',
   *   user => user?.hasValidPayment || 'Payment method invalid'
   * );
   * 
   * @example
   * // Custom error objects with structured data
   * const data = apiResult.unwrapThrowError(
   *   data => data || { status: 404, code: 'NOT_FOUND', message: 'Resource not found' },
   *   data => data.version >= 2 || { status: 400, code: 'VERSION_MISMATCH', message: 'API version too old' }
   * );
   * 
   * @example
   * // Error context access for conditional logic
   * const result = operationResult.unwrapThrowError(
   *   (value, error) => {
   *     if (error?.code === 'RATE_LIMIT') {
   *       return { status: 429, message: 'Rate limited, try again later' };
   *     }
   *     return false; // Continue to next validation
   *   },
   *   value => value?.data || 'No data received'
   * );
   */
  unwrapThrowError(
    ...validationCallbacks: Array<
      (
        value?: T,
        error?: Error
      ) => string | boolean | Record<string, unknown> | void
    >
  ): ExcludeUnknownAndError<T> {
    let shouldIgnoreError = false;
    for (const validationCallback of validationCallbacks) {
      if (typeof validationCallback !== "function") continue;
      try {
        const validationResult = validationCallback(this.value, this.error);

        // if result of callback is null/undefined/false, continue to next validation
        if (typeof validationResult == null || validationResult === false) {
          continue;
        }

        // if result of callback is true, terminate all validations and return the value
        if (validationResult === true) {
          return this.value as ExcludeUnknownAndError<T>;
        }

        if (typeof validationResult === "string") {
          // throw as generic error
          throw new Error(validationResult);
        }

        if (typeof validationResult === "object" && validationResult) {
          // throw the object that dev passed
          throw validationResult;
        }
      } catch (thrownError) {
        throw thrownError;
      }
    }

    if (!shouldIgnoreError && !this.isOk) {
      throw new Error(this.error?.message ?? "");
    }

    return this.value as ExcludeUnknownAndError<T>;
  }

  /**
   * Runs a side-effect if successful, returns this for chaining.
   * 
   * This method allows you to perform actions (like logging) when a Result
   * is successful, without transforming the Result itself. The original
   * Result is returned for method chaining.
   * 
   * @param sideEffect - Function to execute with the success value
   * @returns {this} The original Result for chaining
   * 
   * @see {@link onFailure} For side effects on failure
   * @see {@link fmap} For transforming success values
   * 
   * @example
   * result.onSuccess(value => console.log('Success:', value));
   * 
   * @example
   * // Method chaining
   * const processedResult = result
   *   .onSuccess(value => console.log('Processing:', value))
   *   .fmap(value => value * 2)
   *   .onSuccess(value => console.log('Result:', value));
   */
  onSuccess = (sideEffect: (value: T) => void): this => {
    if (this.isOk) {
      sideEffect(this.value!);
    }
    return this;
  };

  /**
   * Runs a side-effect if failed, returns this for chaining.
   * 
   * This method allows you to perform actions (like logging) when a Result
   * is a failure, without transforming the Result itself. The original
   * Result is returned for method chaining.
   * 
   * @param sideEffect - Function to execute with the error
   * @returns {this} The original Result for chaining
   * 
   * @see {@link onSuccess} For side effects on success
   * @see {@link match} For handling both success and failure cases
   * 
   * @example
   * result.onFailure(error => console.error('Error:', error));
   * 
   * @example
   * // Method chaining with error handling
   * const processedResult = result
   *   .onFailure(error => console.error('Operation failed:', error.message))
   *   .onFailure(error => logToErrorService(error))
   *   .unwrapOrElse(defaultValue);
   */
  onFailure(sideEffect: (error: E) => void): this {
    if (!this.isOk) {
      sideEffect(this.error!);
    }
    return this;
  }
}

/**
 * Type guard to check if a value is a Result object.
 * 
 * This function helps identify whether an unknown value is a Result,
 * which is useful for type narrowing and Result flattening operations.
 * 
 * @param valueToCheck - Value to check if it's a Result
 * @returns {boolean} True if the value is a Result object
 * 
 * @example
 * if (isResultObj(someValue)) {
 *   // TypeScript now knows someValue is a Result
 *   console.log(someValue.isOk);
 * }
 */
function isResultObj<T>(valueToCheck: unknown): valueToCheck is ReturnResult<T> {
  return !!(
    typeof valueToCheck === "object" &&
    valueToCheck &&
    "isOk" in valueToCheck &&
    "value" in valueToCheck &&
    "error" in valueToCheck
  );
}

/**
 * Alias for Result.ok() for more concise success creation.
 * 
 * @see {@link Result.ok}
 * 
 * @example
 * const result = Ok(42); // Same as Result.ok(42)
 */
export const Ok = Result.ok;