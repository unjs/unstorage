import { afterAll, beforeAll, describe, it } from "vitest";
import driver from "../../src/drivers/uploadthing";
import { testDriver } from "./utils";
import { setupServer } from "msw/node";
import { rest } from "msw";

const store: Record<string, any> = {};

const utapiUrl = "https://uploadthing.com/api";
const utfsUrl = "https://utfs.io/f";

const server = setupServer(
  rest.post(`${utapiUrl}/getFileUrl`, async (req, res, ctx) => {
    const { fileKeys } = await req.json();
    const key = fileKeys[0];
    if (!(key in store)) {
      return res(ctx.status(401), ctx.json({ error: "Unauthorized" }));
    }
    return res(
      ctx.status(200),
      ctx.json({
        result: {
          [key]: `https://utfs.io/f/${key}`,
        },
      })
    );
  }),
  rest.get(`${utfsUrl}/:key`, (req, res, ctx) => {
    const key = req.params.key as string;
    if (!(key in store)) {
      return res(ctx.status(404), ctx.json(null));
    }
    return res(
      ctx.status(200),
      ctx.set("content-type", "application/octet-stream"),
      ctx.body(store[key])
    );
  }),
  rest.post(`${utapiUrl}/uploadFiles`, async (req, res, ctx) => {
    console.log("intercepted request");
    return res(
      ctx.status(200),
      ctx.json({
        data: [
          {
            presignedUrls: [`https://my-s3-server.com/:key`],
          },
        ],
      })
    );
  }),
  rest.post(`${utapiUrl}/deleteFile`, async (req, res, ctx) => {
    console.log("hello????");
    const { fileKeys } = await req.json();
    for (const key of fileKeys) {
      delete store[key];
    }
    return res(ctx.status(200), ctx.json({ success: true }));
  })
);

describe(
  "drivers: uploadthing",
  () => {
    //   beforeAll(() => {
    //     server.listen();
    //   });
    //   afterAll(() => {
    //     server.close();
    //   });

    testDriver({
      driver: driver({
        apiKey: "sk_live_xxx",
      }),
      async additionalTests(ctx) {},
    });
  },
  { timeout: 30e3 }
);
