const { cloudinary } = require('../config/cloudinary');

// POST /api/uploads
exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

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

    // Determine resource type for Cloudinary
    let resourceType = 'auto';
    if (req.file.mimetype.startsWith('image/')) {
      resourceType = 'image';
    } else {
      resourceType = 'raw';
    }

    // Upload to Cloudinary from buffer
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'club-events',
          resource_type: resourceType,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

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
    next(error);
  }
};
