// getKeys

export default eventHandler((event) => {
  const query = getQuery<{ base: string }>(event)

  return useStorage('s3').getKeys(query.base)
})
