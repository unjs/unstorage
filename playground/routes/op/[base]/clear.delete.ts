// clear

export default eventHandler((event) => {
  const base = event.context.params['base']

  return useStorage('s3').clear(base)
})
