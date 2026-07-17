export default async (request: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const target = url.searchParams.get('url');

    if (!target) {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = new URL(target);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return new Response(JSON.stringify({ error: 'Only http/https allowed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });

    const contentType = res.headers.get('content-type') || 'text/html';
    const body = await res.text();

    return new Response(body, {
      status: res.status,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'X-Proxy-Used': 'netlify-function',
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Proxy failed' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

export const config = {
  path: "/proxy",
  method: "GET",
};
