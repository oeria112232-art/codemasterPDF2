const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

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

    const pdfBuffer = Buffer.from(fileBase64, 'base64');

    // Priority 1: ConvertFleet API (free, no registration, pdf2docx backend)
    try {
      const formData = new FormData();
      formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), fileName || 'document.pdf');
      formData.append('to', targetFormat);

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
            return {
              statusCode: 200,
              headers: {
                ...CORS_HEADERS,
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${(fileName || 'document').replace(/\.pdf$/i, '')}.${targetFormat}"`,
                'X-Conversion-Service': 'convertfleet',
              },
              body: Buffer.from(arrayBuf).toString('base64'),
              isBase64Encoded: true,
            };
          }
        }
        // Direct binary response
        const arrayBuf = await res.arrayBuffer();
        return {
          statusCode: 200,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${(fileName || 'document').replace(/\.pdf$/i, '')}.${targetFormat}"`,
            'X-Conversion-Service': 'convertfleet',
          },
          body: Buffer.from(arrayBuf).toString('base64'),
          isBase64Encoded: true,
        };
      }
    } catch (e: any) {
      console.warn('ConvertFleet failed:', e.message);
    }

    // Priority 2: CloudConvert (needs API key)
    const ccKey = process.env.CLOUDCONVERT_API_KEY;
    if (ccKey && ['docx', 'pptx'].includes(targetFormat)) {
      try {
        // Create job
        const jobRes = await fetch('https://api.cloudconvert.com/v2/jobs', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ccKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tasks: {
              'import-file': { operation: 'import/base64', file: pdfBuffer.toString('base64'), filename: fileName || 'document.pdf' },
              'convert-file': { operation: 'convert', input: 'import-file', output_format: targetFormat },
              'export-file': { operation: 'export/url', input: 'convert-file' },
            },
          }),
        });

        if (jobRes.ok) {
          const job = await jobRes.json() as any;
          const taskId = job.data?.id;

          // Poll for completion
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
                return {
                  statusCode: 200,
                  headers: {
                    ...CORS_HEADERS,
                    'Content-Type': 'application/octet-stream',
                    'Content-Disposition': `attachment; filename="${(fileName || 'document').replace(/\.pdf$/i, '')}.${targetFormat}"`,
                    'X-Conversion-Service': 'cloudconvert',
                  },
                  body: Buffer.from(arrayBuf).toString('base64'),
                  isBase64Encoded: true,
                };
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
      body: JSON.stringify({ error: 'All conversion services failed. Try again later.' }),
    };
  } catch (e: any) {
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message || 'Conversion failed' }),
    };
  }
};
