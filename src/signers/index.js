import { s3V4Signer } from './s3-v4.js';
import { youdaoV3Signer } from './youdao-v3.js';

const signers = {
  's3-v4': s3V4Signer,
  'youdao-v3': youdaoV3Signer,
};

export async function applySigner(config) {
  if (!config.signer || !config.signer.type) return;

  const fn = signers[config.signer.type];
  if (!fn) throw new Error(`Unknown signer type: ${config.signer.type}`);

  await fn(config);
}
