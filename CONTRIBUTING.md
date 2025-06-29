# Contributing to typed-result

First off, thank you for considering contributing to typed-result! It's people like you that make typed-result such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by the [typed-result Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed after following the steps**
- **Explain which behavior you expected to see instead and why**
- **Include code samples and stack traces if applicable**

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a step-by-step description of the suggested enhancement**
- **Provide specific examples to demonstrate the steps**
- **Describe the current behavior and explain which behavior you expected to see instead**
- **Explain why this enhancement would be useful**

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes (`npm test`)
5. Make sure your code lints (`npm run lint`)
6. Issue that pull request!

## Development Setup

1. Fork and clone the repository
```bash
git clone https://github.com/yourusername/typed-result.git
cd typed-result
```

2. Install dependencies
```bash
npm install
```

3. Create a branch for your feature or fix
```bash
git checkout -b feature/your-feature-name
```

4. Make your changes and write tests

5. Run tests to ensure everything works
```bash
npm test
npm run test:coverage
```

6. Run linting
```bash
npm run lint
npm run format
```

7. Build the project
```bash
npm run build
```

## Project Structure

```
typed-result/
├── src/              # Source code
│   ├── index.ts      # Main entry point
│   └── *.test.ts     # Test files
├── docs/             # Documentation site
├── benchmarks/       # Performance benchmarks
├── examples/         # Example projects
└── scripts/          # Build and utility scripts
```

## Testing

We aim for 100% test coverage. When adding new features or fixing bugs:

- Write unit tests for all new code
- Update existing tests if behavior changes
- Add integration tests for complex features
- Include edge cases in your tests

Example test:
```typescript
describe('Result.map', () => {
  it('should transform success values', () => {
    const result = Result.ok(5).map(x => x * 2);
    expect(result.isOk).toBe(true);
    expect(result.unwrap()).toBe(10);
  });

  it('should pass through errors', () => {
    const error = new Error('test');
    const result = Result.fail<number>(error).map(x => x * 2);
    expect(result.isOk).toBe(false);
    expect(result.error).toBe(error);
  });
});
```

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for all public APIs
- Update the documentation site for new features
- Include code examples in documentation

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only changes
- `style:` Code style changes (formatting, etc)
- `refactor:` Code change that neither fixes a bug nor adds a feature
- `perf:` Performance improvement
- `test:` Adding missing tests
- `chore:` Changes to the build process or auxiliary tools

Examples:
```
feat: add Result.partition method
fix: correct type inference for nested Results
docs: add migration guide from try-catch
```

## Code Style

- Use TypeScript strict mode
- Follow the existing code style
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused
- Prefer functional programming patterns

## Review Process

1. A maintainer will review your PR
2. They may request changes or ask questions
3. Once approved, your PR will be merged
4. Your contribution will be included in the next release

## Release Process

We use semantic versioning and automated releases:

1. PRs are merged to `main`
2. CI runs tests and checks
3. Semantic release determines version bump
4. New version is published to npm
5. Release notes are generated automatically

## Getting Help

- Join our [Discord server](https://discord.gg/typed-result)
- Check the [documentation](https://typed-result.dev)
- Ask questions in GitHub Discussions
- Reach out to maintainers

## Recognition

Contributors are recognized in:
- The project README
- Release notes
- Our documentation site
- Annual contributor spotlight

Thank you for contributing to typed-result! 🎉