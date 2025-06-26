import {test} from '@playwright/test';

import {registerNewMetaMaskWallet, registerNewMetaMaskWalletAndLogin} from './testUtils'
import path from "path";


//prepare metamask
test.beforeAll(async () => {

})

test("create new wallet test", async () => {
    await registerNewMetaMaskWallet();
})


test("login test", async () => {
    await registerNewMetaMaskWalletAndLogin()
})


test("upload, sign, download", async () => {
    const context = await registerNewMetaMaskWalletAndLogin();

    const testPage = context.pages()[0];

    //upload
    await testPage.waitForSelector('[id="file::rc::dropzone"]', {state: 'visible'})
    const fileChooserPromise = testPage.waitForEvent('filechooser');
    await testPage.click('[id="file::rc::dropzone"]')
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'resources/exampleFile.pdf'));

    //sign
    await testPage.getByText("Sign").waitFor({state: 'visible'})
    let metaMaskPromise = context.waitForEvent("page");
    await testPage.getByText("Sign").click()

    //wait for metamask
    await metaMaskPromise;


    //switch network
    let metaMaskPage = context.pages()[1];
    await metaMaskPage.getByText("Sepolia").waitFor({state: 'visible'})
    await metaMaskPage.waitForSelector('[data-testid="page-container-footer-next"]', {state: 'visible'});
    await metaMaskPage.click('[data-testid="page-container-footer-next"]')

    await metaMaskPage.waitForSelector('[data-testid="confirm-footer-button"]', {state: 'visible'})
    await metaMaskPage.click('[data-testid="confirm-footer-button"]')

    //download
    await testPage.getByText("Download").waitFor({state: 'visible'})
    await testPage.getByText("Download").click()

    console.log("upload, sign, download finished!")
})

test("single user aqua-sign", async () => {
    test.setTimeout(100_000)
    const context = await registerNewMetaMaskWalletAndLogin();

    const testPage = context.pages()[0];

    //open "new form" overlay
    await testPage.waitForSelector('[id="menu::rh::trigger"]', {state: 'visible'})
    await testPage.click('[id="menu::rh::trigger"]')
    await testPage.waitForSelector('[id=":rh:/new-file"]', {state: 'visible'});
    await testPage.click('[id=":rh:/new-file"]')

    //select aqua-sign template
    await testPage.getByText("Aqua Sign").waitFor({state: 'visible'});
    await testPage.getByText("Aqua Sign").click()

    //create aqua tree template
    await testPage.waitForSelector('[id=":rk:"]', {state: 'visible'});
    const fileChooserPromise = testPage.waitForEvent('filechooser');
    await testPage.click('[id=":rk:"]')
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'resources/exampleFile.pdf'));
    const metaMaskAdr = await testPage.locator('[id=":rl:"]').inputValue();
    await testPage.fill('[id=":rm:"]', metaMaskAdr);

    let metamaskPromise = context.waitForEvent("page")
    await testPage.click('[type="submit"]');
    await metamaskPromise;

    let metamaskPage = context.pages()[1]
    await metamaskPage.waitForSelector('[data-testid="page-container-footer-next"]', {state: 'visible'});

    //switch network and sign
    await metamaskPage.click('[data-testid="page-container-footer-next"]');
    await metamaskPage.click('[data-testid="confirm-footer-button"]');

    await testPage.getByText("Open Workflow").waitFor({state: 'visible'});
    await testPage.getByText("Open Workflow").click();

    await testPage.getByText("View Contract Document").waitFor({state: 'visible'});
    await testPage.getByText("View Contract Document").click();

    await testPage.getByText("Create Signature").waitFor({state: 'visible'});
    await testPage.getByText("Create Signature").click();

    await testPage.getByText("Save Signature").waitFor({state: 'visible'});
    await testPage.waitForSelector('[class="signature-canvas"]', {state: 'visible'});
    await testPage.click('[class="signature-canvas"]');

    metamaskPromise = context.waitForEvent("page")
    await testPage.getByText("Save Signature").click();
    await metamaskPromise;

    metamaskPage = context.pages()[1]

    await metamaskPage.waitForSelector('[data-testid="confirm-footer-button"]', {state: 'visible'});
    await metamaskPage.click('[data-testid="confirm-footer-button"]')

    await metamaskPage.waitForEvent("close");
    await testPage.getByText("Add Signature to document").waitFor({state: 'visible'});
    await testPage.getByText("Add Signature to document").click();
    await testPage.click('[class="css-1exhycx"]')


    metamaskPromise = context.waitForEvent("page")
    await testPage.getByText("Sign document").click();
    await metamaskPromise;

    metamaskPage = context.pages()[1]

    await metamaskPage.waitForSelector('[data-testid="confirm-footer-button"]', {state: 'visible', timeout: 10000});
    await metamaskPage.click('[data-testid="confirm-footer-button"]')

    await testPage.getByText("Workflow completed and validated").waitFor({state: 'visible'});
})

