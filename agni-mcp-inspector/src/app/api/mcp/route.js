import { NextResponse } from 'next/server';

const MCP_BACKEND_URL = 'https://agni-ai-8f7m.onrender.com/mcp';

export async function POST(req) {
  try {
    const body = await req.json();
    const payload = body?.payload ?? body;
    const customHeaders = Array.isArray(body?.customHeaders) ? body.customHeaders : [];

    const headers = {
      'Content-Type': 'application/json',
    };

    customHeaders.forEach((header) => {
      if (header?.key && header?.value) {
        headers[header.key] = header.value;
      }
    });

    const response = await fetch(MCP_BACKEND_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
