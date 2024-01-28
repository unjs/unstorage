export async function flattenAsyncIterable<T>(iterator: AsyncIterable<T>) {
  const items: T[] = [];
  for await (const item of iterator) {
    items.push(item);
  }
  return items;
}
