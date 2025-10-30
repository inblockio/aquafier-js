import { CheckCircle, Copy, ExternalLink, FileBadge2, FileCode, Hash, MoreHorizontal, Search, Send, ShieldCheck, Trash2, UserRound, Users } from "lucide-react"


const ShareCard = () => {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm">
            {/* Top bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-2 rounded-md bg-slate-50 px-2.5 py-1 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                        <Hash className="w-4 h-4 text-slate-400" />
                        identity_claim-858.json
                    </span>
                    <span className="hidden sm:inline text-xs text-slate-400">
                        Oct 13, 2025 • 12:38:57
                    </span>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 px-2.5 py-1 text-xs font-medium">
                    <CheckCircle className="w-4 h-4" />
                    File imported
                </div>
            </div>
            {/* Body */}
            <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Sender + meta */}
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200">
                                <UserRound className="w-5 h-5 text-slate-500" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="truncate font-medium text-slate-900">Shamaldas</p>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200 px-2 py-0.5 text-xs font-medium">
                                        <Send className="w-3.5 h-3.5" />
                                        Sender
                                    </span>
                                </div>
                                <p className="mt-0.5 text-sm text-slate-500">
                                    Shared via secure channel
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 ring-1 ring-inset ring-slate-200 px-2.5 py-1 text-xs text-slate-600">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                </span>
                                Latest
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 ring-1 ring-inset ring-slate-200 px-2.5 py-1 text-xs text-slate-600">
                                <Users className="w-3.5 h-3.5" />1 ref
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 ring-1 ring-inset ring-slate-200 px-2.5 py-1 text-xs text-slate-600">
                                <FileCode className="w-3.5 h-3.5" />
                                JSON
                            </span>
                        </div>
                    </div>
                    {/* Right: Receivers */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-slate-700">Receivers</h3>
                            {/* <button className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
                                <i data-lucide="refresh-ccw" className="w-4 h-4" /> Refresh
                            </button> */}
                        </div>
                        {/* Receiver Item */}
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 ring-1 ring-inset ring-emerald-200">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                </span>
                                <code className="truncate text-sm text-slate-700 font-medium">
                                    0x254b0d7b63342fcb8955db82e95c21d72efdb6f7
                                </code>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    data-copy="0x254b0d7b63342fcb8955db82e95c21d72efdb6f7"
                                    className="copy-btn rounded-md p-1.5 text-slate-500 hover:text-slate-700 hover:bg-white ring-1 ring-slate-200"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                                <button className="rounded-md p-1.5 text-slate-500 hover:text-slate-700 hover:bg-white ring-1 ring-slate-200">
                                    <ExternalLink className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        {/* Secondary receiver example (muted) */}
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 ring-1 ring-inset ring-slate-200">
                                    <FileBadge2 className="w-4 h-4 text-slate-500" />
                                </span>
                                <code className="truncate text-sm text-slate-600">
                                    0x09B...37a0a9
                                </code>
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 px-2 py-0.5 text-xs font-medium">
                                <i data-lucide="clock" className="w-3.5 h-3.5" />
                                Pending
                            </span>
                        </div>
                    </div>
                </div>
                {/* Actions */}
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 text-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                        <Search className="w-4 h-4" />
                        Review
                    </button>
                    <button className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
                        <Trash2 className="w-4 h-4" />
                        Delete
                    </button>
                    <div className="sm:ml-auto">
                        <button className="inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300">
                            <MoreHorizontal className="w-4 h-4" />
                            More
                        </button>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default ShareCard