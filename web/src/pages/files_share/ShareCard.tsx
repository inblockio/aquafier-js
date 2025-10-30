import { CheckCircle, Copy, ExternalLink, FileBadge2, FileCode, Hash, MoreHorizontal, Search, Send, ShieldCheck, Trash2, UserRound, Users } from "lucide-solid"


const ShareCard = () => {
    return (
        <section  class="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm">
            {/* Top bar */}
            <div  class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-100">
                <div  class="flex items-center gap-3">
                    <span  class="inline-flex items-center gap-2 rounded-md bg-slate-50 px-2.5 py-1 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                        <Hash  class="w-4 h-4 text-slate-400" />
                        identity_claim-858.json
                    </span>
                    <span  class="hidden sm:inline text-xs text-slate-400">
                        Oct 13, 2025 • 12:38:57
                    </span>
                </div>
                <div  class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 px-2.5 py-1 text-xs font-medium">
                    <CheckCircle  class="w-4 h-4" />
                    File imported
                </div>
            </div>
            {/* Body */}
            <div  class="p-4 sm:p-6">
                <div  class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Sender + meta */}
                    <div  class="space-y-4">
                        <div  class="flex items-start gap-3">
                            <div  class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200">
                                <UserRound  class="w-5 h-5 text-slate-500" />
                            </div>
                            <div  class="min-w-0">
                                <div  class="flex items-center gap-2">
                                    <p  class="truncate font-medium text-slate-900">Shamaldas</p>
                                    <span  class="inline-flex items-center gap-1 rounded-full bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200 px-2 py-0.5 text-xs font-medium">
                                        <Send  class="w-3.5 h-3.5" />
                                        Sender
                                    </span>
                                </div>
                                <p  class="mt-0.5 text-sm text-slate-500">
                                    Shared via secure channel
                                </p>
                            </div>
                        </div>
                        <div  class="flex flex-wrap items-center gap-2">
                            <span  class="inline-flex items-center gap-1.5 rounded-full bg-slate-50 ring-1 ring-inset ring-slate-200 px-2.5 py-1 text-xs text-slate-600">
                                <span  class="relative flex h-1.5 w-1.5">
                                    <span  class="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                                    <span  class="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                </span>
                                Latest
                            </span>
                            <span  class="inline-flex items-center gap-1.5 rounded-full bg-slate-50 ring-1 ring-inset ring-slate-200 px-2.5 py-1 text-xs text-slate-600">
                                <Users  class="w-3.5 h-3.5" />1 ref
                            </span>
                            <span  class="inline-flex items-center gap-1.5 rounded-full bg-slate-50 ring-1 ring-inset ring-slate-200 px-2.5 py-1 text-xs text-slate-600">
                                <FileCode  class="w-3.5 h-3.5" />
                                JSON
                            </span>
                        </div>
                    </div>
                    {/* Right: Receivers */}
                    <div  class="space-y-3">
                        <div  class="flex items-center justify-between">
                            <h3  class="text-sm font-medium text-slate-700">Receivers</h3>
                            {/* <button  class="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
                                <i data-lucide="refresh-ccw"  class="w-4 h-4" /> Refresh
                            </button> */}
                        </div>
                        {/* Receiver Item */}
                        <div  class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2">
                            <div  class="flex items-center gap-2 min-w-0">
                                <span  class="inline-flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 ring-1 ring-inset ring-emerald-200">
                                    <ShieldCheck  class="w-4 h-4 text-emerald-600" />
                                </span>
                                <code  class="truncate text-sm text-slate-700 font-medium">
                                    0x254b0d7b63342fcb8955db82e95c21d72efdb6f7
                                </code>
                            </div>
                            <div  class="flex items-center gap-1.5 shrink-0">
                                <button
                                    data-copy="0x254b0d7b63342fcb8955db82e95c21d72efdb6f7"
                                     class="copy-btn rounded-md p-1.5 text-slate-500 hover:text-slate-700 hover:bg-white ring-1 ring-slate-200"
                                >
                                    <Copy  class="w-4 h-4" />
                                </button>
                                <button  class="rounded-md p-1.5 text-slate-500 hover:text-slate-700 hover:bg-white ring-1 ring-slate-200">
                                    <ExternalLink  class="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        {/* Secondary receiver example (muted) */}
                        <div  class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <div  class="flex items-center gap-2 min-w-0">
                                <span  class="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 ring-1 ring-inset ring-slate-200">
                                    <FileBadge2  class="w-4 h-4 text-slate-500" />
                                </span>
                                <code  class="truncate text-sm text-slate-600">
                                    0x09B...37a0a9
                                </code>
                            </div>
                            <span  class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 px-2 py-0.5 text-xs font-medium">
                                <i data-lucide="clock"  class="w-3.5 h-3.5" />
                                Pending
                            </span>
                        </div>
                    </div>
                </div>
                {/* Actions */}
                <div  class="mt-6 flex flex-col sm:flex-row gap-3">
                    <button  class="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 text-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
                        <Search  class="w-4 h-4" />
                        Review
                    </button>
                    <button  class="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
                        <Trash2  class="w-4 h-4" />
                        Delete
                    </button>
                    <div  class="sm:ml-auto">
                        <button  class="inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300">
                            <MoreHorizontal  class="w-4 h-4" />
                            More
                        </button>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default ShareCard