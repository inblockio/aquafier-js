import {test} from '@playwright/test';

import {registerNewMetaMaskWallet, registerNewMetaMaskWalletAndLogin} from './testUtils'
import path from "path";

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
    await testPage.getByText("Sign").click()

    //wait for metamask
    await context.waitForEvent("page")

    let metaMaskPage = context.pages()[1];
    await metaMaskPage.waitForSelector('[data-testid="page-container-footer-next"]', {state: 'visible'});
    await metaMaskPage.click('[data-testid="page-container-footer-next"]')

    //sign
    await context.waitForEvent("page")

    metaMaskPage = context.pages()[1];
    await metaMaskPage.waitForSelector('[data-testid="confirm-footer-button"]', {state: 'visible'})
    await metaMaskPage.click('[data-testid="confirm-footer-button"]')

    //download
    await testPage.getByText("Download").waitFor({state: 'visible'})
    await testPage.getByText("Download").click()

    console.log("upload, sign, download finished!")
})

