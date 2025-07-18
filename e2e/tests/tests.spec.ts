import {test} from '@playwright/test';

import {registerNewMetaMaskWallet, registerNewMetaMaskWalletAndLogin, waitAndClick} from './testUtils'
import path from "path";

test("create new wallet test", async () => {
    await registerNewMetaMaskWallet();
})

test("login test", async () => {
    await registerNewMetaMaskWalletAndLogin()
})

test("upload, sign, download", async () => {
    const response = await registerNewMetaMaskWalletAndLogin();

    const context = response.context;

    const testPage = context.pages()[0];

    //upload
    await testPage.waitForSelector('[data-testid="file-upload-dropzone"]', {state: 'visible'})
    const fileChooserPromise = testPage.waitForEvent('filechooser');
    await testPage.click('[data-testid="file-upload-dropzone"]')
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, './../resources/exampleFile.pdf'));

    //sign
    await testPage.waitForSelector('[data-testid="sign-action-button"]', {state: 'visible'})
    let metaMaskPromise = context.waitForEvent("page");
    await testPage.click('[data-testid="sign-action-button"]')

    //wait for metamask
    await metaMaskPromise;

    //switch network
    let metaMaskPage = context.pages()[1];
    await metaMaskPage.getByText("Sepolia").waitFor({state: 'visible'})

    await waitAndClick(metaMaskPage,'[data-testid="page-container-footer-next"]')

    await waitAndClick(metaMaskPage, '[data-testid="confirm-footer-button"]')

    await metaMaskPage.close();

    //download
    await waitAndClick(testPage,'[data-testid="download-aqua-tree-button"]')

    console.log("upload, sign, download finished!")
})

test("single user aqua-sign", async () => {
    const response = await registerNewMetaMaskWalletAndLogin();

    const context = response.context;
    const testPage = context.pages()[0];

    //open "new form" overlay
    await testPage.waitForSelector('[data-testid="action-form-63-button"]', {state: 'visible'})
    await testPage.click('[data-testid="action-form-63-button"]')
    await testPage.waitForSelector('[data-testid="create-aqua-sign-from-template"]', {state: 'visible'});
    await testPage.click('[data-testid="create-aqua-sign-from-template"]')

    //select aqua-sign template
    await testPage.waitForSelector('[data-testid="action-loading-create-button"]');
    await testPage.click('[data-testid="action-loading-create-button"]')

    //create aqua tree template
    await testPage.waitForSelector('[data-testid="input-document"]', {state: 'visible'});
    const fileChooserPromise = testPage.waitForEvent('filechooser');
    await testPage.click('[data-testid="input-document"]')
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, './../resources/exampleFile.pdf'));
    const metaMaskAdr = await testPage.locator('[data-testid="input-sender"]').inputValue();
    await testPage.fill('[data-testid="input-signers-0"]', metaMaskAdr);

    let metamaskPromise = context.waitForEvent("page")
    await testPage.click('[data-testid="action-loading-create-button"]');
    await metamaskPromise;

    let metamaskPage = context.pages()[1]

    //switch network and sign
    await waitAndClick(metamaskPage, '[data-testid="page-container-footer-next"]')

    await waitAndClick(metamaskPage, '[data-testid="confirm-footer-button"]')

    await waitAndClick(testPage, '[data-testid="open-workflow-button"]')

    await waitAndClick(testPage, '[data-testid="action-view-contract-button"]')

    await waitAndClick(testPage, '[data-testid="action-create-signature-button"]')

    await waitAndClick(testPage, '[class="signature-canvas"]')

    metamaskPromise = context.waitForEvent("page")
    await waitAndClick(testPage, '[data-testid="action-loading-save-signature-button"]')
    await metamaskPromise;

    metamaskPage = context.pages()[1]

    await waitAndClick(metamaskPage, '[data-testid="confirm-footer-button"]')

    await metamaskPage.waitForEvent("close");

    await waitAndClick(testPage, '[data-testid="action-signature-to-document-button"]')

    await waitAndClick(testPage, '[class="css-1exhycx"]')

    metamaskPromise = context.waitForEvent("page")
    await waitAndClick(testPage, '[data-testid="action-sign-document-button"]')
    await metamaskPromise;

    metamaskPage = context.pages()[1]

    waitAndClick(metamaskPage, '[data-testid="confirm-footer-button"]')

    await testPage.getByText("Workflow completed and validated").waitFor({state: 'visible'});
})

