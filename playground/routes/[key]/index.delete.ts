// removeItem

export default eventHandler((event) => {
  const key = event.context.params['key']

  return useStorage('s3').removeItem(key)
})
