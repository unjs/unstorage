import { defineDriver } from './utils'
import S3 from 'aws-sdk/clients/s3'

const LOG_TAG = '[unstorage] [s3-sdk] '

export interface S3SDKOptions {
  bucket: string
}

export default defineDriver((opts: S3SDKOptions) => {
  const s3Client = new S3({})
  
  if (!opts.bucket) {
    throw new Error(LOG_TAG + '`bucket` is required.')
  }
  
  const p = {
    Bucket: opts.bucket
  }
  
  const getMeta = (key) => {
    return s3Client.headObject({
      Key: key,
      ...p
    })
    .promise()
    .then(d => { 
      return {
        atime: undefined,
        mtime: d.LastModified,
        s3: d
      }})
      .catch((r) => {
        if (!['NotFound', 'NoSuchKey'].includes(r?.code)) {
          throw(r)
        }
        
        return { atime: undefined, mtime: undefined }
      })
    }
    
    return {
      getKeys() {
        return s3Client.listObjects({ ...p })
        .promise()
        .then(d => d.Contents.map(o => o.Key))
      },
      getMeta,
      hasItem (key) {
        return getMeta(key)
        .then((meta) => !!meta.mtime)
      },
      getItem (key) {
        return s3Client.getObject({ Key: key, ...p})
        .promise()
        .then(d => d.Body.toString())
      },
      setItem(key, value) {
        return s3Client.upload({ Key: key, Body: value, ...p })
        .promise()
        .then(() => {})
      },
      removeItem (key) {
        return s3Client.deleteObject({ Key: key, ...p })
        .promise()
        .then(() => {})
      },
    }
  })
  