import path from "path";
import {BrowserContext, chromium} from "playwright";

export function generatePassword(length: number): string {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}


export async function registerNewMetaMaskWallet(): Promise<RegisterMetaMaskResponse>{
    const metamaskPath = path.join(__dirname, 'metamask-extension');

    const context = await chromium.launchPersistentContext('', {
        headless: false,
        args: [
            `--disable-extensions-except=${metamaskPath}`,
            `--load-extension=${metamaskPath}`,
        ],
    });

    await context.waitForEvent("page")

    const metaMaskPage = await context.pages()[1];

    await metaMaskPage.waitForLoadState("load");

    //setup-page
    await metaMaskPage.click('[data-testid="onboarding-terms-checkbox"]')
    await metaMaskPage.click('[data-testid="onboarding-create-wallet"]')

    //tele-data deny
    await metaMaskPage.waitForSelector('[data-testid="metametrics-no-thanks"]', {state: 'visible'});
    await metaMaskPage.click('[data-testid="metametrics-no-thanks"]')

    //password setup
    let myNewPassword = generatePassword(15)
    await metaMaskPage.waitForSelector('[data-testid="create-password-new"]', {state: 'visible'})
    await metaMaskPage.fill('[data-testid="create-password-new"]', myNewPassword)
    await metaMaskPage.fill('[data-testid="create-password-confirm"]', myNewPassword)
    await metaMaskPage.click('[data-testid="create-password-terms"]')
    await metaMaskPage.click('[data-testid="create-password-wallet"]')

    //no i dont want to store my wallet
    await metaMaskPage.waitForSelector('[data-testid="secure-wallet-later"]', {state: 'visible'});
    await metaMaskPage.click('[data-testid="secure-wallet-later"]')
    await metaMaskPage.waitForSelector('[data-testid="skip-srp-backup-popover-checkbox"]', {state: 'visible'});
    await metaMaskPage.click('[data-testid="skip-srp-backup-popover-checkbox"]')
    await metaMaskPage.click('[data-testid="skip-srp-backup"]')

    //done
    await metaMaskPage.waitForSelector('[data-testid="onboarding-complete-done"]', {state: 'visible'});
    await metaMaskPage.click('[data-testid="onboarding-complete-done"]')

    //finish tutorial
    await metaMaskPage.waitForSelector('[data-testid="pin-extension-next"]', {state: 'visible'});
    await metaMaskPage.click('[data-testid="pin-extension-next"]')
    await metaMaskPage.waitForSelector('[data-testid="pin-extension-done"]', {state: 'visible'});
    await metaMaskPage.click('[data-testid="pin-extension-done"]')

    await metaMaskPage.waitForSelector('[data-testid="network-display"]', {state: 'visible'});
    await metaMaskPage.waitForSelector('[data-testid="not-now-button"]', {state: 'visible', timeout: 100000});
    await metaMaskPage.click('[data-testid="not-now-button"]')

    await metaMaskPage.waitForSelector('[data-testid="account-menu-icon"]')
    await metaMaskPage.click('[data-testid="account-menu-icon"]')
    await metaMaskPage.waitForSelector('[data-testid="account-list-item-menu-button"]')
    await metaMaskPage.click('[data-testid="account-list-item-menu-button"]')
    await metaMaskPage.waitForSelector('[data-testid="account-list-menu-details"]')
    await metaMaskPage.click('[data-testid="account-list-menu-details"]')
    await metaMaskPage.getByText("Details").waitFor({state: 'visible'})
    await metaMaskPage.getByText("Details").click()
    await metaMaskPage.waitForSelector('[class="mm-box mm-text qr-code__address-segments mm-text--body-md mm-box--margin-bottom-4 mm-box--color-text-default"]')
    const address = await metaMaskPage.locator('[class="mm-box mm-text qr-code__address-segments mm-text--body-md mm-box--margin-bottom-4 mm-box--color-text-default"]').textContent()

    await metaMaskPage.close()

    console.log("Wallet finished!!! Adr: " + address)

    return new RegisterMetaMaskResponse(context, address);
}

export async function registerNewMetaMaskWalletAndLogin(): Promise<RegisterMetaMaskResponse>{
    const response = await registerNewMetaMaskWallet();
    const context = response.context;
    const testPage = context.pages()[0];
    await testPage.waitForLoadState("load")
    await testPage.goto("/")
    await testPage.waitForSelector('[id="dialog::r7::trigger"]', {state: 'visible'})
    const metamaskPromise = context.waitForEvent("page")
    await testPage.click('[id="dialog::r7::trigger"]')
    await metamaskPromise;

    const metamaskPage = context.pages()[1]
    await metamaskPage.waitForSelector('[data-testid="confirm-btn"]', {state: 'visible'})
    await metamaskPage.click('[data-testid="confirm-btn"]')

    await metamaskPage.waitForSelector('[data-testid="confirm-footer-button"]', {state: 'visible'})
    await metamaskPage.click('[data-testid="confirm-footer-button"]')

    return response;
}

class RegisterMetaMaskResponse{


    constructor(context: BrowserContext, walletAddress: string) {
        this.context = context;
        this.walletAddress = walletAddress;
    }

    context: BrowserContext;
    walletAddress: string;
}