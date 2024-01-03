import { $fetch } from "ofetch";
import { defineDriver, createRequiredError } from "./utils";
import { AwsClient } from "aws4fetch";
import crypto from "crypto";
import xml2js from 'xml2js'
import js2xml from 'jstoxml'

if (!globalThis.crypto) {
    // @ts-ignore
    globalThis.crypto = crypto;
}

export interface S3DriverOptions {
    accessKeyId: string;
    secretAccessKey: string;
    endpoint: string;
    region: string;
    bucket: string;
    accountId: string;
}

interface GetItemOptions {
    headers?: Record<string, string>;
}

interface SetItemOptions {
    headers?: Record<string, string>;
    meta?: Record<string, string>;
}

const DRIVER_NAME = "s3";

//@ts-ignore
export default defineDriver((options: S3DriverOptions) => {
    checkOptions(options);

    const awsClient = new AwsClient({
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
        region: options.region,
        service: DRIVER_NAME,
    });

    const normalizedKey = (key: string) => key.replace(/:/g, "/")

    const awsUrlWithoutKey = () => `${options.endpoint}/${options.bucket}`;

    const awsUrlWithKey = (key: string) => `${awsUrlWithoutKey()}/${normalizedKey(key)}`;

    // https://docs.aws.amazon.com/AmazonS3/latest/API/API_HeadObject.html
    async function _getMeta(key: string) {
        const request = await awsClient.sign(awsUrlWithKey(key), {
            method: "HEAD",
        });

        return $fetch.raw(request)
            .then((res) => {
                const metaHeaders: HeadersInit = {};
                for (const [key, value] of res.headers.entries()) {
                    const match = /x-amz-meta-(.*)/.exec(key);
                    if (match) {
                        metaHeaders[match[1]] = value;
                    }
                }
                return metaHeaders
            })
    }

    // https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html
    async function _getKeys(base?: string) {
        const request = await awsClient.sign(awsUrlWithoutKey(), {
            method: "GET",
        });

        return $fetch(request,
            {
                params: {
                    prefix: base && normalizedKey(base)
                }
            })
            .then((res) => {
                let keys: Array<string> = []
                xml2js.parseString(res, (error, result) => {
                    if (error === null) {
                        const contents = result['ListBucketResult']['Contents'] as Array<any>
                        keys = contents.map(item => item['Key'][0])
                    }
                })
                return keys
            }).catch(() => [])
    };

    // https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html
    async function _getItemRaw(key: string, opts: GetItemOptions) {
        const request = await awsClient.sign(awsUrlWithKey(key), {
            method: "GET",
        });

        return $fetch.raw(request)
            .then((res) => {
                opts.headers ||= {}

                for (const [key, value] of res.headers.entries()) {
                    opts.headers[key] = value
                }

                return res._data
            })
            .catch(() => null)
    }

    // https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html
    async function _setItemRaw(key: string, value: any, opts: SetItemOptions) {
        const metaHeaders: HeadersInit = {};

        if (typeof opts.meta === "object") {
            for (const [key, value] of Object.entries(opts.meta)) {
                metaHeaders[`x-amz-meta-${key}`] = value;
            }
        }

        const request = await awsClient.sign(awsUrlWithKey(key), {
            method: "PUT",
            body: value,
            headers: {
                ...opts.headers,
                ...metaHeaders,
            },
        });

        return $fetch(request);
    }

    return {
        name: DRIVER_NAME,
        options,

        getItems(items, commonOptions) { notImplemented("getItems") },
        setItems(items, commonOptions) { notImplemented("setItems") },
        dispose() { notImplemented("dispose") },
        watch(callback) { notImplemented("watch") },

        getItemRaw: _getItemRaw,
        setItemRaw: _setItemRaw,
        getKeys: _getKeys,

        getMeta: (key) => _getMeta(key).catch(() => ({})),

        getItem(key, opts: GetItemOptions) {
            return _getItemRaw(key, opts)
        },

        setItem(key, value, opts: SetItemOptions) {
            let contentType = 'text/plain'

            try {
                JSON.parse(value)
                contentType = 'application/json'
            } catch { }

            opts.headers = {
                'Content-Type': contentType,
                ...opts.headers
            }

            return _setItemRaw(key, value, opts)
        },

        // https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObjects.html
        // Further compatibility check is needed (R2 not supported, Backblaze requires POST method..)
        async clear(base, opts) {
            const keys = await _getKeys(base)

            const body = js2xml.toXML({
                'Delete': keys.map((key) => ({ 'Object': { 'Key': key } }))
            })

            const request = await awsClient.sign(awsUrlWithoutKey(), {
                method: "DELETE",
                body,
                headers: {
                    'x-amz-expected-bucket-owner': options.accountId
                }
            });

            return $fetch(request)
        },

        // https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObject.html
        async removeItem(key, opts) {
            const request = await awsClient.sign(awsUrlWithKey(key), {
                method: "DELETE",
            });

            return $fetch(request);
        },

        async hasItem(key, opts) {
            return _getMeta(key).then(() => true).catch(() => false);
        },
    };
});

function notImplemented(api: string) {
    console.warn(`[${DRIVER_NAME}] ${api} is not implemented`);
}

function checkOptions(options: S3DriverOptions) {
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
