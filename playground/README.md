# S3 driver

## `getItem`

> Gets the value of a key in storage. Resolves to either a javascript primitive value or undefined.

⛔ Not supported because the object is of type Blob.

## `getItemRaw`

> Gets the value of a key in storage in raw format.

✔️ Supported via [GetObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html).

## `getItems`

> Gets the value of a multiple keys in storage in parallel. Each item in array can be either a string or an object.

💬 Supported if the item can be a Blob.

## `setItem`

> Add/Update a value to the storage. If the value is not a string, it will be stringified.

⛔ Not supported because the object is of type Blob.

## `setItemRaw`

> Add/Update a value to the storage in raw format.

✔️ Supported via [PutObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html).

## `setItems`

> Add/Update items in parallel to the storage.

💬 Supported if the item can be a of type Blob.

## `hasItem`

> Checks if storage contains a key. Resolves to either true or false.

✔️ Supported by checking the object's metadata.

## `removeItem`

> Remove a value (and it's meta) from storage.

✔️ Supported via [DeleteObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObject.html).

## `getMeta`

> Get metadata object for a specific key. This data is fetched from two sources: Driver native meta or Custom meta.

✔️ Supported via [HeadObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_HeadObject.html).

## `setMeta`

> Set custom meta for a specific key by adding a $ suffix.

⛔ Not supported because metadata can only be set on upload, [docs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingMetadata.html).

## `removeMeta`

> Remove meta for a specific key by adding a $ suffix.

⛔ Not supported because metadata can only be set on upload, [docs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingMetadata.html).

## `getKeys`

> Get all keys. Returns an array of strings.

✔️ Supported via [ListObjectsV2](https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html).

## `clear`

> Removes all stored key/values. If a base is provided, only mounts matching base will be cleared.

💬 Supported via [DeleteObjects](https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObjects.html).
