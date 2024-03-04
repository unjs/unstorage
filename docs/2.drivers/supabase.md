---
icon: ri:supabase-line
---

# Supabase Storage

> Store data in Supabase Storage.

::read-more{to="https://supabase.com/docs/guides/storage"}
Learn more about Supabase Storage.
::

::warning
Supabase Storage driver is in beta.
::

To use it, you will need to install `@supabase/supabase-js` in your project

```js
import { createStorage } from "unstorage";
import supabaseStorageDriver from "unstorage/drivers/supabase-storage";

const storage = createStorage({
  driver: supabaseStorageDriver({
    url: "<your Supabase project URL>",
    key: "<your Supabase project API key>",
    bucket: "<your Supabase project storage bucket name>",
  }),
});
```

**Options:**

- `base`: [optional] Prefix to use for all keys. Can be used for namespacing.
- `url`: The unique Supabase URL which is supplied when you create a new project in your project dashboard.
- `key`: The unique Supabase Key which is supplied when you create a new project in your project dashboard.
- `bucket`: The Supabase storage bucket name.
