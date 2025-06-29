import { Result } from '../src/index';

// Simple benchmark utility
function benchmark(name: string, fn: () => void, iterations = 1000000) {
  const start = process.hrtime.bigint();
  
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  
  const end = process.hrtime.bigint();
  const duration = Number(end - start) / 1000000; // Convert to milliseconds
  const opsPerSec = (iterations / (duration / 1000)).toFixed(0);
  
  console.log(`${name}: ${opsPerSec} ops/sec (${duration.toFixed(2)}ms for ${iterations} iterations)`);
}

console.log('Running benchmarks...\n');

// Result creation benchmarks
console.log('=== Result Creation ===');
benchmark('Result.ok()', () => {
  Result.ok(42);
});

benchmark('Result.fail()', () => {
  Result.fail('Error');
});

benchmark('Native try-catch (baseline)', () => {
  try {
    const value = 42;
  } catch (e) {
    // Never happens
  }
});

// Transformation benchmarks
console.log('\n=== Transformations ===');
const okResult = Result.ok(42);
const failResult = Result.fail<number>('Error');

benchmark('map() on success', () => {
  okResult.fmap(x => x * 2);
});

benchmark('map() on failure', () => {
  failResult.fmap(x => x * 2);
});

benchmark('flatMap() on success', () => {
  okResult.flatMap(x => Result.ok(x * 2));
});

benchmark('flatMap() on failure', () => {
  failResult.flatMap(x => Result.ok(x * 2));
});

// Pattern matching benchmarks
console.log('\n=== Pattern Matching ===');
benchmark('match() on success', () => {
  okResult.match(
    value => value * 2,
    error => 0
  );
});

benchmark('match() on failure', () => {
  failResult.match(
    value => value * 2,
    error => 0
  );
});

// Unwrapping benchmarks
console.log('\n=== Unwrapping ===');
benchmark('unwrapOr() on success', () => {
  okResult.unwrapOrElse(0);
});

benchmark('unwrapOr() on failure', () => {
  failResult.unwrapOrElse(0);
});

benchmark('unwrapSafe() on success', () => {
  okResult.unwrapSafe();
});

benchmark('unwrapSafe() on failure', () => {
  failResult.unwrapSafe();
});

// Chain operations benchmark
console.log('\n=== Chained Operations ===');
benchmark('Chain of 5 maps on success', () => {
  Result.ok(1)
    .fmap(x => x + 1)
    .fmap(x => x * 2)
    .fmap(x => x - 1)
    .fmap(x => x / 2)
    .fmap(x => x.toString());
}, 100000);

benchmark('Chain of 5 maps on failure', () => {
  Result.fail<number>('Error')
    .fmap(x => x + 1)
    .fmap(x => x * 2)
    .fmap(x => x - 1)
    .fmap(x => x / 2)
    .fmap(x => x.toString());
}, 100000);

// Memory usage estimation
console.log('\n=== Memory Usage ===');
const memBefore = process.memoryUsage().heapUsed;
const results: any[] = [];

for (let i = 0; i < 100000; i++) {
  results.push(Result.ok(i));
}

const memAfter = process.memoryUsage().heapUsed;
const memUsed = (memAfter - memBefore) / 1024 / 1024;
console.log(`Memory for 100k Results: ${memUsed.toFixed(2)} MB`);
console.log(`Average per Result: ${((memAfter - memBefore) / 100000).toFixed(2)} bytes`);

// Comparison with alternatives
console.log('\n=== Comparison with Alternatives ===');

// Traditional try-catch
benchmark('Traditional try-catch pattern', () => {
  try {
    const value = 42;
    const doubled = value * 2;
    const result = doubled + 1;
  } catch (e) {
    const fallback = 0;
  }
});

// Result pattern
benchmark('Result pattern equivalent', () => {
  Result.ok(42)
    .fmap(x => x * 2)
    .fmap(x => x + 1)
    .unwrapOrElse(0);
});

console.log('\n✅ Benchmarks completed!');