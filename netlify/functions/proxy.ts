const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://allpdf.cloud',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function isPrivateIP(hostname: string): boolean {
  if (/^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.|localhost)/.test(hostname)) return true;
  if (hostname === '::1' || hostname === '::') return true;
  return false;
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  try {
    const params = new URLSearchParams(event.queryStringParameters || {});
    const target = params.get('url');

    if (!target) {
      return {
        statusCode: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing url parameter' }),
      };
    }

    const parsed = new URL(target);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return {
        statusCode: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Only http/https allowed' }),
      };
    }

    if (isPrivateIP(parsed.hostname)) {
      return {
        statusCode: 403,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Private/internal URLs are not allowed' }),
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const contentType = res.headers.get('content-type') || 'text/html';
    const body = await res.text();

    return {
      statusCode: res.status,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': contentType,
      },
      body: body,
    };
  } catch (e: any) {
    return {
      statusCode: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message || 'Proxy failed' }),
    };
  }
};
