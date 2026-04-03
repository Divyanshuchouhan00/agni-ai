import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { url, payload, customHeaders = [] } = body;

    if (!url || !payload) {
      return NextResponse.json({ error: { message: "URL and payload are required" } }, { status: 400 });
    }

    // Build fetch headers
    const fetchHeaders = {
      'Content-Type': 'application/json'
    };
    
    // Inject Custom headers provided by User Auth
    if (customHeaders && customHeaders.length > 0) {
        customHeaders.forEach(h => {
            if (h.key && h.value) {
                fetchHeaders[h.key] = h.value;
            }
        });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: fetchHeaders,
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    return NextResponse.json({
      jsonrpc: "2.0",
      error: { code: -32603, message: `Failed to proxy request. ${error.message} - Is the MCP server running?`, details: error.message }
    }, { status: 502 });
  }
}
