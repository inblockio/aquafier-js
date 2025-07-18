import {test} from "@playwright/test";
import fs from "fs";

test('cleanup', async (): Promise<void> => {
        await fs.rmSync('userDir/', { recursive: true, force: true });
})