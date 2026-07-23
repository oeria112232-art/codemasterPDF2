const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://allpdf.cloud',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppt: 'application/vnd.ms-powerpoint',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  tiff: 'image/tiff',
  bmp: 'image/bmp',
  gif: 'image/gif',
  html: 'text/html',
  htm: 'text/html',
  txt: 'text/plain',
  rtf: 'application/rtf',
  csv: 'text/csv',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  epub: 'application/epub+zip',
  json: 'application/json',
  xml: 'application/xml',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  mp4: 'video/mp4',
  webm: 'video/webm',
  avi: 'video/x-msvideo',
  mov: 'video/quicktime',
  ttf: 'font/ttf',
  otf: 'font/otf',
  woff: 'font/woff',
  woff2: 'font/woff2',
};

function getMimeFromExt(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return MIME_MAP[ext] || 'application/octet-stream';
}

function getExtFromFormat(format: string): string {
  const map: Record<string, string> = {
    jpeg: 'jpg', word: 'docx', excel: 'xlsx', powerpoint: 'pptx',
    powerpointpresentation: 'pptx', spreadsheet: 'xlsx', document: 'docx',
  };
  return map[format.toLowerCase()] || format.toLowerCase();
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { fileBase64, fileName, targetFormat } = body;

    if (!fileBase64 || !targetFormat) {
      return {
        statusCode: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing fileBase64 or targetFormat' }),
      };
    }

    const fileBuffer = Buffer.from(fileBase64, 'base64');
    if (fileBuffer.length > MAX_FILE_SIZE) {
      return { statusCode: 413, headers: CORS_HEADERS, body: JSON.stringify({ error: 'File too large (max 25MB)' }) };
    }
    const sourceMime = getMimeFromExt(fileName || 'file.pdf');
    const outputExt = getExtFromFormat(targetFormat);
    const baseName = (fileName || 'document').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_\- ]/g, '_').substring(0, 100);

    // ─── Priority 1: ConvertFleet API (free, no registration) ───
    try {
      const formData = new FormData();
      formData.append('file', new Blob([fileBuffer], { type: sourceMime }), fileName || 'file.pdf');
      formData.append('to', outputExt);

      const apiKey = process.env.CONVERTFLEET_API_KEY;
      const headers: Record<string, string> = {};
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const res = await fetch('https://api.convertfleet.com/v1/convert', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json() as any;
          if (data.download_url) {
            const downloadRes = await fetch(data.download_url);
            const arrayBuf = await downloadRes.arrayBuffer();
            return successResponse(arrayBuf, baseName, outputExt, 'convertfleet');
          }
        }
        // Direct binary response
        const arrayBuf = await res.arrayBuffer();
        return successResponse(arrayBuf, baseName, outputExt, 'convertfleet');
      }
      console.warn(`ConvertFleet returned ${res.status}: ${await res.text()}`);
    } catch (e: any) {
      console.warn('ConvertFleet failed:', e.message);
    }

    // ─── Priority 2: CloudConvert (needs API key) ──────────────
    const ccKey = process.env.CLOUDCONVERT_API_KEY;
    if (ccKey) {
      try {
        const jobRes = await fetch('https://api.cloudconvert.com/v2/jobs', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ccKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tasks: {
              'import-file': { operation: 'import/base64', file: fileBuffer.toString('base64'), filename: fileName || 'file.pdf' },
              'convert-file': { operation: 'convert', input: 'import-file', output_format: outputExt },
              'export-file': { operation: 'export/url', input: 'convert-file' },
            },
          }),
        });

        if (jobRes.ok) {
          const job = await jobRes.json() as any;
          const taskId = job.data?.id;

          for (let attempt = 0; attempt < 30; attempt++) {
            await new Promise(r => setTimeout(r, 2000));
            const statusRes = await fetch(`https://api.cloudconvert.com/v2/jobs/${taskId}`, {
              headers: { 'Authorization': `Bearer ${ccKey}` },
            });
            const status = await statusRes.json() as any;
            if (status.data?.status === 'finished') {
              const exportTask = Object.values(status.data.tasks).find((t: any) => t.operation === 'export/url') as any;
              if (exportTask?.result?.files?.[0]?.url) {
                const fileRes = await fetch(exportTask.result.files[0].url);
                const arrayBuf = await fileRes.arrayBuffer();
                return successResponse(arrayBuf, baseName, outputExt, 'cloudconvert');
              }
            }
            if (status.data?.status === 'error') break;
          }
        }
      } catch (e: any) {
        console.warn('CloudConvert failed:', e.message);
      }
    }

    // No service succeeded
    return {
      statusCode: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'All conversion services failed. Try again later.', service: 'none' }),
    };
  } catch (e: any) {
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message || 'Conversion failed' }),
    };
  }
};

function successResponse(data: ArrayBuffer, baseName: string, ext: string, service: string) {
  return {
    statusCode: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${baseName}.${ext}"`,
      'X-Conversion-Service': service,
    },
    body: Buffer.from(data).toString('base64'),
    isBase64Encoded: true,
  };
}
