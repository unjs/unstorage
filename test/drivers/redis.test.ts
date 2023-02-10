import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStorage } from "../../src";
import driver from "../../src/drivers/redis";


describe("drivers: redis", () => {

    it('setKeyExpire', async () => {
        const storage = createStorage({
            driver: driver({
                url: 'redis://:pwd.@127.0.0.1:6379',
                base: ''
            })
        });

        await storage.setItem('hello', 'unstorage');
        await storage.setKeyExpire('hello', 5);
        expect(await storage.getItem("hello")).toBe("unstorage");


        await new Promise(resolve => setTimeout(resolve, 1000 * 5));

        expect(await storage.hasItem("hello")).toBe(false);

    }, 1000 * 10);
});
