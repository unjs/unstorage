---
icon: devicon-plain:firebase
---

# Firebase

> Store data in Cloud Firestore, using the Firebase web SDK.

## Cloud Firestore

**Driver name:** `firebase-firestore`

::read-more{to="https://firebase.google.com/docs/firestore"}
Learn more about Cloud Firestore.
::

This driver keeps each key as one document in a Firestore collection: `{ key, value, modifiedAt }`. It uses the `firebase/firestore` web SDK, so it works in the browser and in Node.js, and with Firestore's offline cache. Changes from other clients can be followed with `storage.watch()`.

To use it, you will need to install `firebase` in your project:

:pm-install{name="firebase"}

Usage:

```js
import { initializeApp } from "firebase/app";
import * as firestoreLib from "firebase/firestore";
import { createStorage } from "unstorage";
import firestoreDriver from "unstorage/drivers/firebase-firestore";

const app = initializeApp({/* your web app config */});

const storage = createStorage({
  driver: firestoreDriver({
    firestore: firestoreLib.getFirestore(app),
    collection: "unstorage",
    lib: firestoreLib,
  }),
});
```

**Authentication:**

The driver uses whatever the `firestore` instance is signed in as (for example with Firebase Auth). Access is decided by your [Firestore security rules](https://firebase.google.com/docs/firestore/security/get-started), so a per-user collection such as `users/<uid>/kv` with a rule limiting it to that user is a common setup.

**Options:**

- **`firestore`** (required): A Firestore instance from `getFirestore()` or `initializeFirestore()`.
- `collection`: Path of the collection that holds the entries. Defaults to `unstorage`.
- `lib`: The `firebase/firestore` module. Pass the same one your `firestore` instance comes from, so bundlers don't load a second copy.
- `incremental`: Start `watch` from Firestore's local cache and fetch from the server only entries written since the newest cached one. Defaults to `false`. See below.

**Notes:**

- Any unstorage key works: keys are escaped into valid document ids, and kept in the `key` field so `getKeys(base)` is a single range query.
- `setItems` writes in atomic batches of up to 500.
- `getMeta` returns `mtime`; Firestore has no cheap way to keep a creation time without an extra read, so `birthtime` is not set.
- `watch` resolves with the listener's first snapshot, which can come from the local cache, so it also starts offline. From then on, reads see what this client knows, and anything the server adds to that, or that changes later on this client or any other, is reported as it arrives. While watching, the driver answers reads from the listener's copy, so a client that watches first and then reads pays one document read per entry, once.
- With `incremental: true`, a client that has started before pays only for entries written since, instead of reading the whole collection on every start. Before narrowing, it checks with a count query (one read per 1000 entries) that the cache holds every older entry, and fetches everything if not. It fits collections that are only added to, such as event logs: an entry another client removes is not noticed while it is still in this client's cache. Use it with a persistent local cache large enough to hold the collection, for example `initializeFirestore(app, { localCache: persistentLocalCache({ cacheSizeBytes: CACHE_SIZE_UNLIMITED }) })`.
