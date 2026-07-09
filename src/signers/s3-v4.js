export async function s3V4Signer(config) {
  const { signer } = config;

  let targetUrl = config.url || '';
  let method = config.method || 'GET';
  let body = config.body || '';

  const u = new URL(targetUrl);
  const accessKey = signer.accessKey;
  const secretKey = signer.secretKey;
  const region = signer.region || 'us-east-1';
  const service = 's3';

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = await sha256(body);

  const canonicalHeaders = {
    host: u.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };

  const sortedHeaderKeys = Object.keys(canonicalHeaders).sort();
  const canonicalHeadersStr = sortedHeaderKeys
    .map(k => k.toLowerCase() + ':' + canonicalHeaders[k].trim() + '\n')
    .join('');
  const signedHeaders = sortedHeaderKeys.map(k => k.toLowerCase()).join(';');

  let canonicalUri = u.pathname;
  if (!canonicalUri || canonicalUri === '') canonicalUri = '/';
  const encodedUri = canonicalUri.split('/').map(seg => encodeURIComponent(decodeURIComponent(seg))).join('/');

  const canonicalQuery = u.searchParams.toString();

  const canonicalRequest = [
    method,
    encodedUri,
    canonicalQuery,
    canonicalHeadersStr,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    await sha256(canonicalRequest),
  ].join('\n');

  const kSecret = new TextEncoder().encode('AWS4' + secretKey);
  const kDate = await hmac(kSecret, dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, 'aws4_request');

  const signature = await hmacHex(kSigning, stringToSign);
  const authorization = `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  if (!config.headers) config.headers = {};
  config.headers['x-amz-date'] = amzDate;
  config.headers['x-amz-content-sha256'] = payloadHash;
  config.headers['Authorization'] = authorization;
}

async function sha256(data) {
  const enc = new TextEncoder().encode(data);
  const hash = await crypto.subtle.digest('SHA-256', enc);
  return bytesToHex(new Uint8Array(hash));
}

async function hmac(key, data) {
  const alg = { name: 'HMAC', hash: 'SHA-256' };
  const cryptoKey = await crypto.subtle.importKey('raw', key, alg, false, ['sign']);
  const sig = await crypto.subtle.sign(alg, cryptoKey, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

async function hmacHex(key, data) {
  const sig = await hmac(key, data);
  return bytesToHex(sig);
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
