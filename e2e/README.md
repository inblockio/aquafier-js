### Preparation
Execute the e2e/script/prepare_browser.sh from the project root:
```bash
./e2e/script/prepare_browser.sh
```

### Run tests

#### Run all tests
```bash
npx playwright test [--retries 3]
```

#### Run a specific test file
```bash
npx playwright test e2e/tests.spec.ts --headed --retries 3
```

#### Run a specific test by title
```bash
npx playwright test -g "share document between two users"
```

#### Run tests with debugging

**Headless vs Headed Mode:**

Tests run **headless by default** (no visible browser window). To see the browser during test execution:

```bash
# Headless mode (default - no browser window shown)
npx playwright test

# Headed mode (visible browser window for debugging)
HEADED=true npx playwright test

# Run specific test in headed mode
HEADED=true npx playwright test -g "login test"
```

You can also set `HEADED=true` in the `.env` file in the e2e directory to always run in headed mode.

**Debug Mode:**

```bash
# Run in debug mode (steps through test)
npx playwright test --debug

# Run headed with debug output
HEADED=true npx playwright test --debug
```

### Github-Action
There is a Github-Workflow which prepares a Docker-Compose environment and executes all tests. After the run is finished, you can see the result in the run overview.
