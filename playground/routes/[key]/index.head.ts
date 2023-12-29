// hasItem

export default eventHandler(async (event) => {
  const key = event.context.params['key']

  const exists = await useStorage('s3').hasItem(key)

  if (!exists) {
    throw createError({ message: 'not-found', statusCode: 404 })
  }
})
