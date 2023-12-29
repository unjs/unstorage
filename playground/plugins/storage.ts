import s3 from '../../src/drivers/s3'

export default defineNitroPlugin(() => {

    const driver = s3(useRuntimeConfig().s3)
    
    useStorage().mount('s3', driver)
})