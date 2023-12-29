import { defineDriver, createRequiredError } from './utils'

export interface S3Options {
    accessKeyId: string;
    secretAccessKey: string;
    endpoint: string;
    region: string;
    bucket: string;
}

const DRIVER_NAME = "s3";

export default defineDriver((options: S3Options) => {
    checkOptions(options)

    return {
        name: DRIVER_NAME,
        options,

        getItem(key, opts) { notImplemented('getItem') },
        setItem(key, value, opts) { notImplemented('setItem') },
        getItems(items, commonOptions) { notImplemented('getItems') },
        setItems(items, commonOptions) { notImplemented('setItems') },
        dispose() { notImplemented('dispose') },
        watch(callback) { notImplemented('watch') },

        getItemRaw(key, opts) { },
        setItemRaw(key, value, opts) { },
        hasItem(key, opts) { },
        removeItem(key, opts) { },
        getKeys(base, opts) { },
        clear(base, opts) { },
        getMeta(key, opts) { },
    }
})


function notImplemented(api: string) {
    console.warn(`[${DRIVER_NAME}] ${api} is not implemented`)
}

function checkOptions(options: S3Options) {
    if (!options.accessKeyId) {
        throw createRequiredError(DRIVER_NAME, "accessKeyId");
    }
    if (!options.secretAccessKey) {
        throw createRequiredError(DRIVER_NAME, "secretAccessKey");
    }
    if (!options.bucket) {
        throw createRequiredError(DRIVER_NAME, "bucket");
    }
    if (!options.endpoint) {
        throw createRequiredError(DRIVER_NAME, "endpoint");
    }
    if (!options.region) {
        throw createRequiredError(DRIVER_NAME, "region");
    }
}