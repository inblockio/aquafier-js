### Preparation
Execute the e2e/script/prepare_browser.sh from the project root :)

### Run tests
``npx playwright test [--tries=3]``

### Github-Action
There is a Github-Workflow which prepares a Docker-Compose environment and executes all tests. After the run is finished, you can see the result in the run overview.
