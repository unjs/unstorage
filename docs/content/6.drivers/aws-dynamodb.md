# Amazon DynamoDB

Store data in a [Amazon DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html) table.

This driver uses the DynamoDB table as a key value store. By default it uses the `key` as the table partition key and the `value` as content. This options can be changed using `attributes`.

To use it, you will need to install `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb` in your project:

```bash
npm i @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

Minimal usage:

```js
import { createStorage } from "unstorage";
import dynamoDbCacheDriver from "unstorage/drivers/aws-dynamodb";

const storage = createStorage({
  driver: dynamoDbCacheDriver({
    table: "my-persistent-storage", // required
    region: "us-east-1", // optional, retrieved via environment variables
    credentials: {
      // optional, retrieved by AWS SDK via environment variables
      accessKeyId: "xxxxxxxxxx", // DO NOT HARD-CODE SECRETS
      secretAccessKey: "xxxxxxxxxxxxxxxxxxxx", // DO NOT HARD-CODE SECRETS
    },
  }),
});
```

Persistent configuration usage:

```js
import { createStorage } from "unstorage";
import dynamoDbCacheDriver from "unstorage/drivers/aws-dynamodb";

const storage = createStorage({
  driver: dynamoDbCacheDriver({
    table: "my-table-name", // required
    attributes: {
      key: "key", // optional, configure attributes name
      value: "value", // optional, configure attributes name
    },
  }),
});
```

Temporary configurations:

```js
import { createStorage } from "unstorage";
import dynamoDbCacheDriver from "unstorage/drivers/aws-dynamodb";

const storage = createStorage({
  driver: dynamoDbCacheDriver({
    table: "my-table-name", // required
    attributes: {
      key: "key",
      value: "value",
      ttl: "ttl", // optional, configure attributes name
    },
    expireIn: 300, // optional, values in seconds or 0 to disable
  }),
});
```

When `expireIn` is set to a number greater than 0 the driver will add seconds to the current timestamp and set the TTL attribute.
Otherwise removing the `expireIn` option or setting it to 0 will disable this functionality.

Since the DynamoDB items deletion is asynchronous the driver will check the validity of the TTL attribute before returning them from `getItem` and `getKeys` operations. This in order to ensure that no expired items will be returned.

**Authentication:**

The driver supports the default [AWS SDK credentials](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html).

The IAM role or IAM user that use the driver need the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Scan",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/my-table-name"
    }
  ]
}
```

**Options:**

- `table`: The name of the DynamoDB table.
- `region`: The AWS region to use.
- `credentials`: The AWS SDK credentials object.
- `attributes`: The key, value and TTL attributes mapping to table item attributes.
- `expireIn`: The number of seconds to add to the current timestamp to set the TTL attribute. Set to 0 to disable it.
