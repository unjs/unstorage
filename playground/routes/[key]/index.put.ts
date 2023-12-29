// setItemRaw

export default eventHandler(async (event) => {
  const key = event.context.params['key']

  const body = await readRawBody(event, false)

  const opts = {
    headers: {},
    meta: {
      //  'user-id': '123'
    }
  }

  return useStorage('s3').setItemRaw(key, body, opts)
})
