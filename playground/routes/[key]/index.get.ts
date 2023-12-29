// getItemRaw

export default eventHandler((event) => {
  const key = event.context.params['key']

  // Content-Type header should be set

  return useStorage('s3').getItemRaw(key)
})
