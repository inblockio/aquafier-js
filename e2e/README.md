### Preparation
Download the latest version of the MetaMask Chrome-Extension: https://github.com/MetaMask/metamask-extension/releases
Place the content of the *chrome zip into the e2e folder e2e/metamask-extension/\<zipContent\>

### Run tests
``npx playwright test [--tries=3]``

### Github-Action
There is a Github-Workflow which prepares a Docker-Compose environment and executes all tests. After the run is finished, you can see the result in the run overview.
