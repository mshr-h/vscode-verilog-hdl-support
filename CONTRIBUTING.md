# Contributing to Verilog-HDL/SystemVerilog Support for VS Code

:+1::tada: First off, thanks for taking the time to contribute! :tada::+1:

The following is a set of guidelines for contributing to this repository. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

Any other contribution is also welcome! (fixing typo, refactoring, documentation, and so on). It is always preferred to file an issue about the feature you are going to work on and then send a pull request.

## Getting Started

Before you begin:
- Have you read the [code of conduct](CODE_OF_CONDUCT.md)?
- Check out the [existing issues](https://github.com/mshr-h/vscode-verilog-hdl-support/issues)
- Review the [documentation](./docs/)

## Steps to Follow

1. File an issue about your new feature or bug fix
2. Fork this repository
3. Create your feature branch (`git checkout -b feature/amazing-feature`)
4. Set up your development environment (see [Development Guide](./docs/DEVELOPMENT.md))
5. Make your changes
6. Add tests for your changes
7. Ensure all tests pass (`npm test`)
8. Lint your code (`npm run lint`)
9. Add your changes to **CHANGELOG.md** under "Unreleased"
10. Edit the **README.md** if necessary
    - List of Configuration Settings
    - Table of Compatibility
    - Add References/Thanks
    - anything else...
11. Commit your changes (`git commit -m 'Add some amazing feature'`)
12. Push to the branch (`git push origin feature/amazing-feature`)
13. Create a new Pull Request
14. And wait patiently :smile:

## Development Resources

### Documentation

- **[Architecture Overview](./docs/ARCHITECTURE.md)** - Understanding the codebase structure
- **[Development Guide](./docs/DEVELOPMENT.md)** - Setting up and working with the codebase
- **[Adding Features](./docs/ADDING_FEATURES.md)** - Step-by-step guide for common tasks
- **[Known Issues](./docs/TODO.md)** - Current TODO items and improvement opportunities

### Development Guidelines

For those using VS Code, install [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) and [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) extensions. The workspace already has recommended extensions configured.

#### Code Style

- Follow the existing code style
- Use TypeScript with strict type checking
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Write self-documenting code

#### Testing

- Add unit tests for new features
- Ensure existing tests pass
- Test manually in the Extension Development Host
- Consider edge cases

#### Commits

- Write clear, descriptive commit messages
- Reference issue numbers in commits (e.g., "Fix #123")
- Keep commits focused on a single change
- Follow conventional commit format when possible

## Types of Contributions

### 🐛 Bug Reports

When filing a bug report, please include:
- VS Code version
- Extension version
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Relevant logs from the Output panel

### 💡 Feature Requests

When suggesting a feature:
- Explain the use case
- Describe the proposed solution
- Consider alternatives
- Be open to discussion

### 📝 Documentation

- Fix typos or unclear explanations
- Add examples
- Translate documentation
- Improve code comments

### 🔧 Code Contributions

Areas where contributions are especially welcome:
- Adding new linters
- Improving language server integration
- Enhancing providers (completion, hover, etc.)
- Adding tests
- Performance improvements

See [Adding Features Guide](./docs/ADDING_FEATURES.md) for detailed instructions.

## Pull Request Process

1. Update documentation to reflect your changes
2. Add tests for new functionality
3. Ensure the build passes (`npm run compile`)
4. Update CHANGELOG.md
5. Request review from maintainers
6. Address review feedback
7. Once approved, your PR will be merged

## Community

- Be respectful and inclusive
- Help others learn
- Give constructive feedback
- Celebrate successes

## Questions?

- Check the [documentation](./docs/)
- Search [existing issues](https://github.com/mshr-h/vscode-verilog-hdl-support/issues)
- Ask in [discussions](https://github.com/mshr-h/vscode-verilog-hdl-support/discussions)

Thank you for contributing! 🎉
