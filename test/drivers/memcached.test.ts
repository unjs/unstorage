import { describe, it, expect, vi, vitest, beforeEach, afterEach } from 'vitest'
import driver from '../../src/drivers/memcached'
import { createStorage } from '../../src'
import { testDriver } from './utils'

describe('Memcached storage', () => {
    const storage = driver({
        serverLocation: 'localhost:11211',
        connectionOptions: {}
    });

    it('driver: basic',async () => {
        // @ts-ignore
        await storage.setItem('basic', 'foo', 0);
        let got = await storage.getItem('basic');
        const has = await storage.hasItem('basic');
        expect(got).toBe('foo');
        expect(has).toBeTruthy();
        await storage.removeItem('basic');
        got = await storage.getItem('basic');
        expect(got).toBeUndefined();
    });
});