// setItemRaw

export default eventHandler(async (event) => {
  const key = event.context.params['key']

  const body = await readRawBody(event, false)

  return useStorage('s3').setItemRaw(key, body)
})
