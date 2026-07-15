const { S3Client, PutObjectCommand, ListBucketsCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const client = new S3Client({
  region: process.env.B2_REGION || 'us-west-002',
  endpoint: process.env.B2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.B2_ACCESS_KEY_ID.trim(),
    secretAccessKey: process.env.B2_SECRET_ACCESS_KEY.trim(),
  },
  forcePathStyle: true,
});

async function test() {
  console.log('🔑 Key ID:', process.env.B2_ACCESS_KEY_ID);
  console.log('📍 Endpoint:', process.env.B2_ENDPOINT);
  console.log('📦 Bucket:', process.env.B2_BUCKET_NAME);
  
  try {
    // 1. Tester la connexion
    console.log('\n🔄 Test de connexion...');
    const result = await client.send(new ListBucketsCommand({}));
    console.log('✅ Connexion réussie !');
    console.log('📦 Buckets :', result.Buckets.map(b => b.Name).join(', '));
    
    // 2. Tester l'upload
    console.log('\n🔄 Test upload...');
    const testBuffer = Buffer.from('Test upload ' + Date.now());
    const key = `test-${Date.now()}.txt`;
    
    await client.send(new PutObjectCommand({
      Bucket: process.env.B2_BUCKET_NAME,
      Key: key,
      Body: testBuffer,
      ContentType: 'text/plain',
      ACL: 'public-read',
    }));
    console.log(`✅ Upload test réussi ! Fichier: ${key}`);
    
    console.log('\n🎉 Tout fonctionne ! Votre configuration est bonne.');
    
  } catch (error) {
    console.error('\n❌ Erreur :', error.message);
    console.error('📋 Code :', error.name);
    console.error('📋 Détails :', error.stack);
  }
}

test();