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
npx playwright test e2e/sharing.spec.ts --headed --retries 3
```

#### Run a specific test by title
```bash
npx playwright test -g "share document between two users"
```

#### Run tests with debugging
```bash
# Run with headed browsers (visible)
npx playwright test --headed

# Run in debug mode
npx playwright test --debug

# Slow down test execution
npx playwright test --slow-mo=500
```

### Github-Action
There is a Github-Workflow which prepares a Docker-Compose environment and executes all tests. After the run is finished, you can see the result in the run overview.
