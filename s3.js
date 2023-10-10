require('dotenv').config;
const fs = require('fs');
const S3 = require('aws-sdk/clients/s3');
const crypto = require('crypto');

const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

const randomImageName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString('hex');

const s3 = new S3({
  region,
  accessKeyId,
  secretAccessKey,
});

// upload a file to s3
// Modify your uploadFile function to include the ACL parameter:
function uploadFile(file) {
  const fileStream = fs.createReadStream(file.path);
  const fileExtension = file.originalname.split('.').pop();
  const fileName = `${randomImageName()}.${fileExtension}`;

  const uploadParams = {
    Bucket: bucketName,
    Body: fileStream,
    Key: fileName,
  };

  return s3.upload(uploadParams).promise();
}

exports.uploadFile = uploadFile;
