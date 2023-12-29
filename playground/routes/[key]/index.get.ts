// getItemRaw

export default eventHandler((event) => {
  const key = event.context.params['key']

  const opts = {
    headers: {}
  }

  return useStorage('s3').getItemRaw(key, opts)
    .then((res) => {
      setResponseHeaders(event, opts.headers)
      return res
    })
})
