"use client";

export default function ExecutionPanel() {
    return (
        <div className="flex h-full items-center justify-center bg-[#080c10] text-center text-[#6b7280]">
            <div className="max-w-md px-6">
                <p className="text-[11px] font-bold uppercase tracking-widest text-white">Execution Removed</p>
                <p className="mt-3 text-sm leading-6">
                    AGNI is currently focused on AI generation, API extraction, and output rendering.
                    Runtime execution and local server controls have been removed.
                </p>
            </div>
        </div>
    );
}
