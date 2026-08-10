import { v2 as cloudinary } from 'cloudinary'

import { env } from './env'

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
})

/**
 * The only file that should import the `cloudinary` SDK directly — anything
 * that needs to upload/transform/delete an asset should go through a future
 * `services/`/`integrations`-style adapter built on top of this client, per
 * docs/FolderStructure.md's "one adapter file per third-party SDK" rule.
 */
export { cloudinary }
