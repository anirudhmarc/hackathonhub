import express from 'express';
import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import childProcess from 'child_process';
import ffmpegPath from 'ffmpeg-static';

const router = express.Router();

const s3 = new AWS.S3({ region: process.env.AWS_REGION || 'ap-southeast-5' });

router.post('/transcode', async (req, res) => {
  try {
    const { bucket, key, outputKey } = req.body;
    if (!bucket || !key) return res.status(400).json({ error: 'bucket and key required' });

    const tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'tmp-'));
    const inputPath = path.join(tmpDir, 'input');
    const outputPath = path.join(tmpDir, 'output.mp4');

    const getObj = s3.getObject({ Bucket: bucket, Key: key }).createReadStream();
    const ws = fs.createWriteStream(inputPath);
    await pipeline(getObj, ws);

    await new Promise((resolve, reject) => {
      const args = ['-i', inputPath, '-c:v', 'libx264', '-crf', '23', '-preset', 'medium', '-c:a', 'aac', '-b:a', '128k', outputPath];
      const cp = childProcess.spawn(ffmpegPath, args, { stdio: 'inherit' });
      cp.on('error', reject);
      cp.on('close', (code) => code === 0 ? resolve() : reject(new Error('ffmpeg failed with ' + code)));
    });

    const outKey = outputKey || key.replace(/\.[^/.]+$/, '.mp4');

    const uploadResult = await s3.upload({ Bucket: bucket, Key: outKey, Body: fs.createReadStream(outputPath), ContentType: 'video/mp4', ACL: 'public-read' }).promise();

    try { fs.unlinkSync(inputPath); } catch (e) {}
    try { fs.unlinkSync(outputPath); } catch (e) {}
    try { fs.rmdirSync(tmpDir); } catch (e) {}

    res.json({ url: uploadResult.Location, key: outKey });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
