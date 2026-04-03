"use client";

export function humanizeErrorMessage(error) {
    const raw = typeof error === "string"
        ? error
        : error?.message || JSON.stringify(error || {});

    const message = raw || "Something went wrong while talking to AGNI.";
    const lower = message.toLowerCase();

    if (lower.includes("api_key_required") || lower.includes("api key required")) {
        return "Add your Groq API key in Settings to use AGNI.";
    }
    if (lower.includes("failed to parse url")) {
        return "Please enter a valid URL only. Remove HTTP methods like GET or POST from the input.";
    }
    if (lower.includes("429") || lower.includes("rate limit")) {
        return "Too many requests right now. Please wait a few minutes and try again.";
    }
    if (lower.includes("networkerror") || lower.includes("failed to fetch") || lower.includes("network request failed")) {
        return "AGNI could not reach the backend. Check that the MCP server is running and try again.";
    }
    if (lower.includes("timeout")) {
        return "The request took too long to finish. Please try again with a smaller or more specific prompt.";
    }
    if (lower.includes("unauthorized") || lower.includes("forbidden") || lower.includes("401") || lower.includes("403")) {
        return "Authentication failed. Check your configured API key or request headers in Settings.";
    }
    if (lower.includes("unexpected token") || lower.includes("json")) {
        return "AGNI received an invalid response format. Please retry the request.";
    }

    return message;
}
