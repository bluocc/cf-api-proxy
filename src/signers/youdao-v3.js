export async function youdaoV3Signer(config) {
  const { signer, queryParams } = config;

  const appKey = signer.appKey;
  const key = signer.key;
  const vocabId = signer.vocabId || '';

  const salt = Date.now().toString();
  const curtime = Math.round(Date.now() / 1000).toString();

  const qParam = queryParams ? queryParams.find(p => p.key === 'q') : null;
  const queryText = qParam ? qParam.value : '';

  const signStr = appKey + truncate(queryText) + salt + curtime + key;
  const sign = await sha256(signStr);

  if (!config.queryParams) config.queryParams = [];

  const existingKeys = new Set(config.queryParams.map(p => p.key));
  const needed = [
    { key: 'appKey', value: appKey },
    { key: 'salt', value: salt },
    { key: 'sign', value: sign },
    { key: 'signType', value: 'v3' },
    { key: 'curtime', value: curtime },
  ];
  if (vocabId) needed.push({ key: 'vocabId', value: vocabId });

  for (const n of needed) {
    if (!existingKeys.has(n.key)) {
      config.queryParams.push(n);
    }
  }
}

function truncate(q) {
  if (!q) return '';
  const len = q.length;
  if (len <= 20) return q;
  return q.substring(0, 10) + len + q.substring(len - 10, len);
}

async function sha256(data) {
  const enc = new TextEncoder().encode(data);
  const hash = await crypto.subtle.digest('SHA-256', enc);
  return bytesToHex(new Uint8Array(hash));
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
