const connectCloudinary = () => {
  console.log('[CLOUDINARY] Configuration Check:');
  console.log('[CLOUDINARY] Cloud Name:', process.env.VITE_CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing');
  console.log('[CLOUDINARY] Upload Preset:', process.env.VITE_CLOUDINARY_UPLOAD_PRESET ? '✅ Set' : '❌ Missing');
  
  if (!process.env.VITE_CLOUDINARY_CLOUD_NAME || !process.env.VITE_CLOUDINARY_UPLOAD_PRESET) {
    console.error('[CLOUDINARY ERROR] Missing required environment variables!');
    console.error('Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env file');
  } else {
    console.log('[CLOUDINARY] ✅ Using unsigned upload with preset method');
  }
};

module.exports = { connectCloudinary };
