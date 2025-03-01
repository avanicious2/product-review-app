// pages/api/gen-s3-url.js
import { S3Client, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: "ap-south-1",
  endpoint: "https://storage.googleapis.com",
  credentials: {
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET,
  },
  forcePathStyle: true, // Required for using GCS with S3 client
});

export default async function handler(req, res) {
  console.log('Generate URL API called with method:', req.method);
  console.log('Request body:', req.body);

  if (req.method !== 'POST') {
    console.log('Invalid method attempted:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { scrape_id } = req.body;
  console.log('Extracted parameters:', { scrape_id });

  if (!scrape_id) {
    console.log('Missing required fields');
    return res.status(400).json({
      error: 'Missing required fields',
      received: { scrape_id },
    });
  }
  try {
    // Try different image extensions
    const extensions = ['.jpeg', '.jpg', '.webp', '.png'];
    const baseObjectKey = `scraped-assets/v3/${scrape_id}/${scrape_id}_1000`;
    let presignedUrl = null;
    const bucketName = "alle-products";
  
    console.log('===== S3 URL GENERATION =====');
    console.log(`Trying to generate URL for scrape_id: ${scrape_id}`);
    console.log(`Base object key: ${baseObjectKey}`);
  
    for (const ext of extensions) {
      const objectKey = baseObjectKey + ext;
      console.log(`Trying extension: ${ext}, full key: ${objectKey}`);
  
      try {
        // First check if object exists using HeadObjectCommand
        // This is equivalent to head_object in the Python boto3 script
        const headCommand = new HeadObjectCommand({
          Bucket: bucketName,
          Key: objectKey,
        });
  
        console.log(`Checking if object exists: bucket=${bucketName}, key=${objectKey}`);
        
        // This will throw an error if the object doesn't exist
        await s3Client.send(headCommand);
        console.log(`Object exists! Found image with extension ${ext}`);
        
        // Now generate the presigned URL
        const getCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: objectKey,
        });
        
        presignedUrl = await getSignedUrl(s3Client, getCommand, {
          expiresIn: 604800, // 7 days in seconds - same as in Python script
        });
        
        console.log(`Successfully generated presigned URL for ${objectKey}`);
        // If we get here, the object exists and URL was generated successfully
        break;
      } catch (err) {
        console.log(`FAILED for extension ${ext}: ${err.message}`);
        // Continue to the next extension if this one failed, just like in the Python script
        continue;
      }
    }
  
    if (!presignedUrl) {
      console.log('❌ No valid image found after trying all extensions');
      return res.status(404).json({
        error: 'No valid image found',
        scrape_id: scrape_id
      });
    }
  
    console.log('✅ Successfully generated presigned URL');
    console.log('URL starts with:', presignedUrl.substring(0, 50) + '...');
    return res.status(200).json({
      url: presignedUrl
    });
  } catch (error) {
    console.error('Error generating URL:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      error: 'Failed to generate URL',
      details: error.message,
    });
  }
}