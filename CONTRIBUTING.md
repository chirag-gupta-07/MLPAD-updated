# Contributing to MPLADS AI Risk Intelligence Platform

Thank you for your interest in contributing to the **MPLADS AI Risk Intelligence Platform (MLPAD)**.

## Code of Conduct
We are committed to providing a welcoming, inclusive, and harassment-free environment for all contributors.

## How to Contribute

### 1. Reporting Issues
- Use the GitHub Issue Tracker to report bugs or request new features.
- Provide clear steps to reproduce bugs and specify relevant environment details.

### 2. Development Setup
1. Fork the repository and clone your fork locally.
2. Create a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Set up the frontend:
   ```bash
   cd frontend
   npm install
   ```

### 3. Guidelines for Submitting Pull Requests
- Follow PEP 8 style guidelines for Python code.
- Write unit tests for new features and bug fixes in `tests/`.
- Ensure all automated tests pass before opening a pull request:
   ```bash
   pytest tests/ -v
   ```
- Ensure TypeScript builds cleanly:
   ```bash
   cd frontend && npm run build
   ```
- Open a Pull Request against the `main` branch with a descriptive title and detailed summary of changes.
