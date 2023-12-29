import { $fetch } from "ofetch";
import { defineDriver, createRequiredError } from "./utils";
import { AwsClient } from "aws4fetch";
import crypto from "crypto";
import { parseString } from 'xml2js'

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
}

interface GetItemOptions {
    headers?: HeadersInit;
}

interface SetItemOptions {
    headers?: HeadersInit;
    // https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingMetadata.html#UserMetadata
    meta?: Record<string, string>;
}

const DRIVER_NAME = "s3";

export default defineDriver((options: S3DriverOptions) => {
    checkOptions(options);

    const awsClient = new AwsClient({
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
        region: options.region,
        service: DRIVER_NAME,
    });

    const awsUrlWithKey = (key: string) =>
        `${options.endpoint}/${options.bucket}/${normalizeKey(key)}`;
    const awsUrlWithoutKey = () => `${options.endpoint}/${options.bucket}`;

    return {
        name: DRIVER_NAME,
        options,

        getItem(key, opts) {
            notImplemented("getItem");
        },
        setItem(key, value, opts) {
            notImplemented("setItem");
        },
        getItems(items, commonOptions) {
            notImplemented("getItems");
        },
        setItems(items, commonOptions) {
            notImplemented("setItems");
        },
        dispose() {
            notImplemented("dispose");
        },
        watch(callback) {
            notImplemented("watch");
        },

        async getItemRaw(key, opts: GetItemOptions) {
            const request = await awsClient.sign(awsUrlWithKey(key), {
                method: "GET",
            });

            return $fetch(request, {
                onResponse({ response }) {
                    opts.headers = response.ok ? response.headers : {};
                },
            });
        },

        async setItemRaw(key, value, opts: SetItemOptions) {
            const metaHeaders: HeadersInit = {};

            if (typeof opts.meta === "object") {
                Object.keys(opts.meta).forEach((key) => {
                    metaHeaders[`x-amz-meta-${key}`] = opts.meta![key];
                });
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
        },

        async removeItem(key, opts) {
            const request = await awsClient.sign(awsUrlWithKey(key), {
                method: "DELETE",
            });

            return $fetch(request);
        },

        async getMeta(key, opts) {
            const request = await awsClient.sign(awsUrlWithKey(key), {
                method: "HEAD",
            });

            return $fetch(request, {
                onResponse({ response }) {
                    const metaHeaders: HeadersInit = {};
                    if (response.ok) {
                        for (const item of response.headers.entries()) {
                            const match = /x-amz-meta-(.*)/.exec(item[0]);
                            if (match) {
                                metaHeaders[match[1]] = item[1];
                            }
                        }

                    }
                    response._data = metaHeaders;
                },
            });
        },

        async getKeys(base, opts) {
            const request = await awsClient.sign(awsUrlWithoutKey(), {
                method: "GET",
            });

            return $fetch(request, {
                params: {
                    prefix: base && normalizeBase(base)
                },
                onResponse({ response }) {
                    let keys: Array<string> = []
                    if (response.ok) {
                        parseString(response._data, (error, result) => {
                            if (error === null) {
                                const contents = result['ListBucketResult']['Contents'] as Array<any>
                                keys = contents.map(item => item['Key'][0])
                            }
                        })
                    }
                    response._data = keys
                },
            });
        },

        async clear(base, opts) {
            const request = await awsClient.sign(awsUrlWithoutKey(), {
                method: "DELETE",
            });

            return $fetch(request);
        },

        async hasItem(key, opts) {
            const meta = await this.getMeta!(key, {});
            return meta ? Object.keys(meta).length > 0 : false;
        },
    };
});

function normalizeKey(key: string) {
    // https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html
    return key.replace(/:/g, "/");
}

function normalizeBase(base: string) {
    return base.replace(/:/g, "/");
}

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
