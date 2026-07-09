const el = (id) => document.getElementById(id);

const requestUrl = el('requestUrl');
const methodSelect = el('methodSelect');
const paramsList = el('paramsList');
const addParamBtn = el('addParamBtn');
const urlPreview = el('urlPreview');
const signerSelect = el('signerSelect');
const headersList = el('headersList');
const addHeaderBtn = el('addHeaderBtn');
const requestBody = el('requestBody');
const bodyGroup = el('bodyGroup');
const sendBtn = el('sendBtn');
const responseSection = el('responseSection');
const statusBadge = el('statusBadge');
const timeBadge = el('timeBadge');
const responseBody = el('responseBody');
const toast = el('toast');

let toastTimer;

function showToast(msg) {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function updateBodyVisibility() {
  const m = methodSelect.value;
  bodyGroup.style.display = (m === 'GET' || m === 'DELETE') ? 'none' : 'block';
}
methodSelect.addEventListener('change', updateBodyVisibility);
updateBodyVisibility();

function buildUrlPreview() {
  const base = requestUrl.value.trim();
  const params = getKvPairs(paramsList);
  if (!base) { urlPreview.innerHTML = '&nbsp;'; return; }
  try {
    const u = new URL(base);
    for (const p of params) {
      if (p.key) u.searchParams.append(p.key, p.value);
    }
    urlPreview.textContent = u.toString();
  } catch {
    urlPreview.textContent = base;
  }
}

requestUrl.addEventListener('input', buildUrlPreview);

function addKvRow(list, key, value, removable) {
  const row = document.createElement('div');
  row.className = 'kv-row';

  const k = document.createElement('input');
  k.type = 'text';
  k.className = 'kv-key';
  k.placeholder = 'Key';
  if (key) k.value = key;

  const v = document.createElement('input');
  v.type = 'text';
  v.className = 'kv-value';
  v.placeholder = 'Value';
  if (value) v.value = value;

  const rm = document.createElement('button');
  rm.className = 'btn btn-secondary btn-sm remove-kv';
  rm.textContent = '\u2212';
  if (!removable) rm.disabled = true;
  rm.addEventListener('click', () => { row.remove(); buildUrlPreview(); });

  k.addEventListener('input', buildUrlPreview);
  v.addEventListener('input', buildUrlPreview);

  row.appendChild(k);
  row.appendChild(v);
  row.appendChild(rm);
  list.appendChild(row);
}

function getKvPairs(list) {
  const pairs = [];
  list.querySelectorAll('.kv-row').forEach(row => {
    const key = row.querySelector('.kv-key').value.trim();
    const val = row.querySelector('.kv-value').value;
    if (key) pairs.push({ key, value: val });
  });
  return pairs;
}

addParamBtn.addEventListener('click', () => addKvRow(paramsList, '', '', true));
addHeaderBtn.addEventListener('click', () => addKvRow(headersList, '', '', true));

function initKvFirstBtn(list) {
  const rows = list.querySelectorAll('.kv-row');
  if (rows.length === 1) rows[0].querySelector('.remove-kv').disabled = true;
}
initKvFirstBtn(paramsList);
initKvFirstBtn(headersList);

const s3Fields = el('s3Fields');
const youdaoFields = el('youdaoFields');
const s3AccessKey = el('s3AccessKey');
const s3SecretKey = el('s3SecretKey');
const s3Region = el('s3Region');
const ydAppKey = el('ydAppKey');
const ydKey = el('ydKey');
const ydVocabId = el('ydVocabId');

signerSelect.addEventListener('change', () => {
  const v = signerSelect.value;
  s3Fields.classList.toggle('active', v === 's3-v4');
  youdaoFields.classList.toggle('active', v === 'youdao-v3');
});

document.querySelectorAll('.collapse-header').forEach(h => {
  h.addEventListener('click', () => {
    const target = el(h.dataset.target);
    const arrow = h.querySelector('.arrow');
    target.classList.toggle('open');
    arrow.classList.toggle('open');
  });
});

function getSignerConfig() {
  const type = signerSelect.value;
  if (!type) return null;
  if (type === 's3-v4') {
    return {
      type: 's3-v4',
      accessKey: s3AccessKey.value.trim(),
      secretKey: s3SecretKey.value.trim(),
      region: s3Region.value.trim() || 'us-east-1',
    };
  }
  if (type === 'youdao-v3') {
    return {
      type: 'youdao-v3',
      appKey: ydAppKey.value.trim(),
      key: ydKey.value.trim(),
      vocabId: ydVocabId.value.trim(),
    };
  }
  return null;
}

sendBtn.addEventListener('click', async () => {
  const url = requestUrl.value.trim();
  if (!url) { requestUrl.focus(); showToast('请输入请求 URL'); return; }

  const method = methodSelect.value;
  const headers = {};
  getKvPairs(headersList).forEach(h => { headers[h.key] = h.value; });
  const body = (method !== 'GET' && method !== 'DELETE') ? requestBody.value : undefined;
  const queryParams = getKvPairs(paramsList);
  const signer = getSignerConfig();

  if (signer && signer.type === 's3-v4' && (!signer.accessKey || !signer.secretKey)) {
    showToast('S3 签名模式需要填写 Access Key 和 Secret Key');
    return;
  }
  if (signer && signer.type === 'youdao-v3' && (!signer.appKey || !signer.key)) {
    showToast('有道 v3 签名模式需要填写 appKey 和 Key');
    return;
  }

  sendBtn.disabled = true;
  sendBtn.innerHTML = '<span class="loader"></span> 发送中...';
  responseSection.style.display = 'none';

  try {
    const res = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, method, headers, queryParams, body, signer }),
    });

    const result = await res.json();

    const statusClass = result.status >= 200 && result.status < 300 ? 'badge-success' : 'badge-error';
    statusBadge.className = 'badge ' + statusClass;
    statusBadge.textContent = result.status + ' ' + (result.statusText || '');

    timeBadge.textContent = result.timeMs + 'ms 耗时';

    let displayData = result.data;
    try {
      displayData = JSON.stringify(JSON.parse(result.data), null, 2);
    } catch {}
    responseBody.textContent = displayData;
    responseSection.style.display = 'block';
  } catch (err) {
    statusBadge.className = 'badge badge-error';
    statusBadge.textContent = '请求失败';
    timeBadge.textContent = '-';
    responseBody.textContent = err.message;
    responseSection.style.display = 'block';
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = '\u27A4 发送请求';
  }
});
