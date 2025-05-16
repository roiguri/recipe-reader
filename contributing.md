# Contributing Guidelines

Thank you for considering contributing to the Recipe Auto-Creation Service! This document outlines the branching strategy, commit message format, and workflow to follow when contributing to this project.

## Branching Strategy

### Main Branches

- `main` - Production-ready code. This branch should always be deployable.
- `develop` - Integration branch for features. This is where features are combined before release.

### Feature Branches

For new features or enhancements:

- Format: `feature/<issue-number>-<short-description>`
- Example: `feature/42-text-processing-service`
- Branch from: `develop`
- Merge back to: `develop` via Pull Request

### Bug Fix Branches

For fixing bugs in development:

- Format: `bugfix/<issue-number>-<short-description>`
- Example: `bugfix/57-url-extraction-error`
- Branch from: `develop`
- Merge back to: `develop` via Pull Request

### Hotfix Branches

For urgent fixes needed in production:

- Format: `hotfix/<issue-number>-<short-description>`
- Example: `hotfix/63-security-vulnerability`
- Branch from: `main`
- Merge back to: `main` AND `develop` via Pull Request

### Release Branches

For preparing releases:

- Format: `release/v<version-number>`
- Example: `release/v1.0.0`
- Branch from: `develop`
- Merge back to: `main` AND `develop` via Pull Request

### Documentation Branches

For documentation updates only:

- Format: `docs/<short-description>`
- Example: `docs/api-documentation`
- Branch from: `develop`
- Merge back to: `develop` via Pull Request

### Refactoring Branches

For code improvements without changing functionality:

- Format: `refactor/<issue-number>-<short-description>`
- Example: `refactor/75-optimize-pdf-generation`
- Branch from: `develop`
- Merge back to: `develop` via Pull Request

## Commit Message Guidelines

Write clear, concise commit messages that explain WHY a change was made, not just WHAT was changed.

### Format

```
<type>(<scope>): <subject>

<body>
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (formatting, etc.)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

### Example

```
feat(text-processing): implement ingredient extraction

- Add regex patterns for identifying ingredient quantities
- Integrate with NLP service for entity recognition
- Add unit tests for common recipe formats
```

## Pull Request Process

1. Ensure your code follows the project's coding standards
2. Update documentation as necessary
3. Add appropriate tests for your changes
4. Keep PRs focused on a single feature or bug fix
5. Reference any related issues in your PR description

## Development Workflow

1. Create a new branch from `develop` (or `main` for hotfixes)
2. Make your changes in small, logical commits
3. Push your branch and create a Pull Request
4. Address any review comments
5. Once approved, merge your PR
6. Delete your branch after merging

Thank you for contributing to our project!