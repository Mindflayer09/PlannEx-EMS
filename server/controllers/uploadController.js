const FormData = require('form-data');
const axios = require('axios');

// POST /api/uploads
exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    console.log(`[UPLOAD] Starting file upload: ${req.file.originalname}`);

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Allowed: images, PDF, DOC, DOCX',
      });
    }

    // Build folder path for multi-tenant organization
    const folderName = req.user?.team 
      ? `teams/${req.user.team}/uploads` 
      : 'platform-general';

    console.log(`[UPLOAD] Uploading to folder: ${folderName}`);

    // Create FormData for Cloudinary unsigned upload
    const form = new FormData();
    form.append('file', req.file.buffer, req.file.originalname);
    form.append('upload_preset', process.env.VITE_CLOUDINARY_UPLOAD_PRESET);
    form.append('folder', folderName);

    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`;
    
    console.log(`[UPLOAD] Cloudinary URL: ${cloudinaryUrl}`);

    const response = await axios.post(cloudinaryUrl, form, {
      headers: form.getHeaders(),
    });

    const result = response.data;
    console.log(`[UPLOAD SUCCESS] File uploaded: ${result.secure_url}`);

    res.json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        fileType: req.file.mimetype.split('/')[0],
        format: result.format,
        size: result.bytes,
      },
    });
  } catch (error) {
    console.error(`[UPLOAD EXCEPTION]`, error.message);
    if (error.response?.data) {
      console.error(`[UPLOAD ERROR RESPONSE]`, error.response.data);
    }
    next(error);
  }
};