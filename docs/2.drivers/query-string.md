----
icon: mdi:link-variant
---

# Query String

> Store data in URL query parameters for shareable and bookmarkable state

## Usage

**Driver name:** `query-string`

Store data directly in the URL's query string parameters, making application state shareable via URLs and accessible during server-side rendering.

```js
import { createStorage } from "unstorage";
import queryStringDriver from "unstorage/drivers/query-string";

const storage = createStorage({
  driver: queryStringDriver({ 
    base: "app",
    updateHistory: true 
  }),
});

// URL: https://example.com/page
await storage.setItem("filter", "active");
// URL becomes: https://example.com/page?app_filter=active

await storage.setItem("sort", { by: "date", order: "desc" });
// URL becomes: https://example.com/page?app_filter=active&app_sort=%7B%22by%22%3A%22date%22%2C%22order%22%3A%22desc%22%7D
```

## Options

- `url`: URL or Location object to use for reading/writing query parameters (defaults to `window.location` in browser)
- `base`: Prefix for all keys to avoid conflicts with other query parameters (e.g., "app" → "app_key")
- `updateHistory`: Whether to update browser history when setting/removing items (default: `true` in browser, `false` in SSR)
- `historyMethod`: History update method - `"pushState"` adds to history, `"replaceState"` modifies current entry (default: `"replaceState"`)
- `window`: Window object for browser environments
- `maxUrlLength`: Maximum URL length before warning (default: `2000`, set to `0` to disable)

## Use Cases

### E-commerce Filters

```js
// Store product filters in URL for shareable search results
await storage.setItem("category", "electronics");
await storage.setItem("price", { min: 100, max: 500 });
await storage.setItem("brand", ["apple", "samsung"]);
// URL: ?category=electronics&price=%7B%22min%22%3A100%2C%22max%22%3A500%7D&brand=%5B%22apple%22%2C%22samsung%22%5D
```

### Dashboard Configuration

```js
// Save dashboard view preferences
await storage.setItem("view", "grid");
await storage.setItem("timeRange", "7d");
await storage.setItem("metrics", ["revenue", "users"]);
```

### Server-Side Rendering (SSR)

```js
// Node.js/SSR environment
import { URL } from 'url';

const url = new URL(request.url);
const storage = createStorage({
  driver: queryStringDriver({ url }),
});

// Access query parameters on the server
const filters = await storage.getItem("filters");
```

## Features

### Automatic Serialization

The driver automatically handles various data types:

```js
await storage.setItem("string", "hello");        // ?string=hello
await storage.setItem("number", 42);             // ?number=42
await storage.setItem("boolean", true);          // ?boolean=true
await storage.setItem("object", { foo: "bar" }); // ?object=%7B%22foo%22%3A%22bar%22%7D
await storage.setItem("array", [1, 2, 3]);       // ?array=%5B1%2C2%2C3%5D
```

### Browser History Integration

Control how URL updates affect browser navigation:

```js
// Replace current history entry (default)
const storage = createStorage({
  driver: queryStringDriver({ 
    historyMethod: "replaceState" 
  }),
});

// Add new history entry for each change
const storage = createStorage({
  driver: queryStringDriver({ 
    historyMethod: "pushState" 
  }),
});

// Disable history updates
const storage = createStorage({
  driver: queryStringDriver({ 
    updateHistory: false 
  }),
});
```

### Watch for Changes

Listen to browser navigation events:

```js
const unwatch = await storage.watch((event, key) => {
  console.log(`Query param ${key} ${event === "update" ? "changed" : "removed"}`);
});

// Clean up when done
unwatch();
```

## Limitations

- **URL Length**: Browsers typically support URLs up to ~2000 characters. The driver will warn when approaching this limit.
- **Value Types**: Complex objects are JSON-stringified, which may increase URL length significantly.
- **Special Characters**: Keys and values are URL-encoded, which may reduce readability.
- **Security**: Sensitive data should not be stored in URLs as they are visible and logged by servers.

## Browser Compatibility

This driver works in all modern browsers that support:
- [URLSearchParams API](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)
- [History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API) (for history updates)

For SSR and Node.js environments, it works with the built-in `URL` class.