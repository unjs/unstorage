export default defineBackground(() => {
  console.log("Hello background!", { id: browser.runtime.id });

  browser.storage.local.onChanged.addListener((changes) => {
    for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
      console.log(
        `[storage] "${key}": ${JSON.stringify(oldValue)} → ${JSON.stringify(newValue)}`
      );
    }
  });
});
