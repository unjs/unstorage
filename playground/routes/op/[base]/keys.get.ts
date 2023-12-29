// getKeys

export default eventHandler((event) => {
  const base = event.context.params['base']

  return useStorage('s3').getKeys(base)
})
