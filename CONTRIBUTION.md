# Contribution to Aqua-Protocol

We welcome contributions to the Aqua Protocol project! This guide will help you get started with contributing to our codebase.

## How to Contribute

### 1. Fork and clone
- Fork the repository on GitHub
- Clone your fork locally: `git clone git@github.com:inblockio/aquafier-js.git`

### 2. Create a Branch
- Create a new branch for your feature/fix: `git checkout -b feature/your-feature-name`
- Use descriptive branch names (e.g., `feature/add-wallet-integration`, `fix/share-page-rerender`)

### 3. Make Changes
- Write clean, well-documented code
- Follow the existing code style and conventions
- Add tests for new functionality - Playwright tests
- Ensure all tests pass before submitting

### 4. Commit Your Changes
Follow our commit message convention (see below for details):
```bash
git add .
git commit -m "feat: add new wallet integration feature"
```

### 5. Submit a Pull Request
- Push your branch: `git push`
- Create a pull request on GitHub - Open github on your forked repository and click on "New Pull Request"
- Provide a clear description of your changes
- Link any related issues

## Commit Message Convention

We use conventional commit messages to maintain a clean and readable git history. Each commit message should follow this format:

```md
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Commit Types

- **feat**: A new feature for the user
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc.)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools and libraries
- **ci**: Changes to CI configuration files and scripts
- **build**: Changes that affect the build system or external dependencies

### Examples

```bash
feat: add wallet connection functionality
fix: resolve SharePage component rerender issues
docs: update API documentation for new endpoints
test: add unit tests for authentication service
chore: update dependencies to latest versions
refactor: simplify user authentication logic
perf: optimize database queries for better performance
style: fix code formatting and linting issues
```

### Scope (Optional)
The scope should be the name of the component/module affected:
```bash
feat(auth): add OAuth integration
fix(ui): resolve button styling issues
test(api): add integration tests for user endpoints
```

## Code Review Process

1. All submissions require review before merging
2. Address feedback promptly and professionally
3. Keep pull requests focused and atomic
4. Update documentation when necessary

## Getting Help

- Check existing issues and discussions
- Join our community channels
- Ask questions in pull request comments
- Review the project documentation

Thank you for contributing to Aqua Protocol!
