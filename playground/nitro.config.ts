//https://nitro.unjs.io/config
export default defineNitroConfig({
    storage: {
        's3': {
            driver: 'fs',
            base: './data/db'
        }
    }
});
