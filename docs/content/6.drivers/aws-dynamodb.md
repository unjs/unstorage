# Amazon DynamoDB

Store data in a [Amazon DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html) table.

This driver uses the DynamoDB table as a key value store. By default it uses the `key` as the table partition key and the `value` as content. This options can be changed using `attributes`.

To use it, you will need to install `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb` in your project:

```bash
npm i @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

Usage:

```js
import { createStorage } from "unstorage";
import dynamoDbCacheDriver from "unstorage/drivers/aws-dynamodb";

const storage = createStorage({
  driver: dynamoDbCacheDriver({
    table: 'my-table-name', // required
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'xxxxxxxxxx',
      secretAccessKey: 'xxxxxxxxxxxxxxxxxxxx',
    },
    attributes: {
      key: 'key',
      value: 'value',
    };
  }),
});
```

**Authentication:**

The driver supports the default [AWS SDK credentials](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html).

The IAM role or user that use the driver need the following permissions:

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
- `attributes`: The key/value attributes mapping to table item attributes.
