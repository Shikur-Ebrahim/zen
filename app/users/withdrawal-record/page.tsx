"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
    ChevronLeft,
    Loader2,
    Calendar,
    CheckCircle2,
    Clock,
    TrendingDown,
    Building2,
    ShieldCheck,
    History,
    AlertCircle,
    Copy,
    Check,
    Banknote,
    TrendingUp,
    XCircle,
    ArrowUpRight,
    Search,
    ShieldAlert,
    Wallet,
    Lock
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function WithdrawalRecordPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<any[]>([]);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                router.push("/");
                return;
            }

            const q = query(
                collection(db, "Withdrawals"),
                where("userId", "==", currentUser.uid)
            );

            const unsubscribeDocs = onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as any[];

                const sorted = data.sort((a, b) => {
                    const timeA = a.createdAt?.seconds || 0;
                    const timeB = b.createdAt?.seconds || 0;
                    return timeB - timeA;
                });

                setRecords(sorted);
                setLoading(false);
            });

            return () => unsubscribeDocs();
        });

        return () => unsubscribeAuth();
    }, [router]);

    const { pending, history, stats } = useMemo(() => {
        const p = records.filter(r => r.status === 'pending');
        const h = records.filter(r => r.status !== 'pending');

        return {
            pending: p,
            history: h,
            stats: {
                totalSettled: records
                    .filter(r => r.status === 'verified' || r.status === 'approved' || r.status === 'success')
                    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0),
                inPipeline: records
                    .filter(r => r.status === 'pending')
                    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
            }
        };
    }, [records]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050510] flex flex-col items-center justify-center p-6">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
                <p className="mt-8 text-xs font-bold tracking-widest text-indigo-400/40">Loading records...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050510] text-white font-sans selection:bg-indigo-500/30 pb-32">
            {/* Background Atmosphere */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-full h-[40%] bg-gradient-to-b from-indigo-500/10 to-transparent"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05),transparent_70%)]"></div>
            </div>

            {/* Premium Header */}
            <header className="sticky top-0 z-[60] bg-[#050510]/90 backdrop-blur-2xl border-b border-indigo-500/10 px-6 h-28 flex items-center justify-between max-w-lg mx-auto shadow-2xl">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.back()}
                        className="w-12 h-12 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center text-indigo-400 hover:bg-indigo-500/10 transition-all active:scale-90"
                    >
                        <ChevronLeft size={26} strokeWidth={3} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight leading-none">Withdrawal Records</h1>
                        <div className="flex items-center gap-2 mt-2">
                            <ShieldCheck size={12} className="text-indigo-400" />
                            <span className="text-[10px] font-bold text-indigo-400/40 uppercase tracking-widest">Verified</span>
                        </div>
                    </div>
                </div>
                <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-2xl">
                    <History size={26} strokeWidth={2.5} />
                </div>
            </header>

            <main className="px-6 py-10 space-y-12 max-w-lg mx-auto relative z-10 w-full">
                {/* Refined Stats Block */}
                <section className="grid grid-cols-2 gap-5 animate-in fade-in slide-in-from-top-4 duration-1000">
                    <div className="group relative bg-indigo-600 p-8 rounded-[2.5rem] shadow-[0_20px_60px_rgba(79,70,229,0.2)] flex flex-col justify-between h-44 overflow-hidden">
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex justify-between items-start relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-black/10 flex items-center justify-center text-white">
                                <TrendingUp size={24} strokeWidth={3} />
                            </div>
                        </div>
                        <div className="relative z-10">
                            <p className="text-xs font-bold text-white/50 mb-2">Total Withdrawn</p>
                            <p className="text-2xl font-bold text-white tracking-tight leading-none break-words">
                                {stats.totalSettled.toLocaleString()} <span className="text-[11px] font-bold opacity-60">ETB</span>
                            </p>
                        </div>
                    </div>

                    <div className="group relative bg-[#0A0A1F] p-8 rounded-[2.5rem] border border-indigo-500/20 shadow-2xl flex flex-col justify-between h-44 overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
                        <div className="flex justify-between items-start relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                <Clock size={24} className="animate-pulse" />
                            </div>
                        </div>
                        <div className="relative z-10">
                            <p className="text-xs font-bold text-indigo-400/40 mb-2">Pending Amount</p>
                            <p className="text-2xl font-bold text-white tracking-tight leading-none break-words">
                                {stats.inPipeline.toLocaleString()} <span className="text-[11px] text-indigo-400/60 font-bold">ETB</span>
                            </p>
                        </div>
                    </div>
                </section>

                <div className="space-y-16">
                    {/* Active Transactions */}
                    {pending.length > 0 && (
                        <div className="space-y-8">
                            <header className="flex items-center gap-5 px-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_15px_#6366f1]"></div>
                                <h3 className="text-sm font-bold text-indigo-400 tracking-wide">Active Withdrawals ({pending.length})</h3>
                                <div className="flex-1 h-px bg-white/5"></div>
                            </header>
                            <div className="space-y-10">
                                {pending.map(item => (
                                    <WithdrawalCard key={item.id} item={item} status="pending" />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Historical Cycles */}
                    <div className="space-y-8">
                        <header className="flex items-center gap-5 px-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-white/10"></div>
                            <h3 className="text-sm font-bold text-white/30 tracking-wide">Completed Withdrawals</h3>
                            <div className="flex-1 h-px bg-white/5"></div>
                        </header>
                        {history.length > 0 ? (
                            <div className="space-y-10">
                                {history.map(item => (
                                    <WithdrawalCard key={item.id} item={item} status={item.status} />
                                ))}
                            </div>
                        ) : pending.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-28 text-center space-y-8 animate-in fade-in duration-1000">
                                <div className="w-28 h-28 bg-[#0A0A1F] rounded-[2.5rem] shadow-2xl flex items-center justify-center text-indigo-500/10 border border-white/5 transform -rotate-2">
                                    <Banknote size={56} strokeWidth={1.5} />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-lg font-bold text-white tracking-tight">No records found</p>
                                    <p className="text-xs text-white/30 max-w-[200px] leading-relaxed mx-auto font-medium">You haven't made any withdrawals yet.</p>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </main>
        </div>
    );
}

function WithdrawalCard({ item, status }: any) {
    const isPending = status === 'pending';
    const isSuccess = status === 'verified' || status === 'approved' || status === 'success';
    const isFailed = status === 'rejected' || status === 'failed';

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative rounded-[2.5rem] bg-[#0A0A1A] border border-white/5 shadow-2xl overflow-hidden group
                ${isPending ? 'border-indigo-500/20 shadow-indigo-500/5' :
                    isSuccess ? 'border-emerald-500/10' :
                        'border-red-500/10'}
            `}
        >
            {/* Status Ribbon Indicator */}
            <div className={`absolute top-0 left-0 right-0 h-1.5 ${isPending ? 'bg-indigo-500' : isSuccess ? 'bg-emerald-500' : 'bg-red-500'}`}></div>

            <div className="relative p-8 space-y-8 z-10">
                {/* Header Information */}
                <div className="flex justify-between items-start gap-6">
                    <div className="space-y-4 flex-1 min-w-0">
                        <div className={`w-fit px-4 py-1.5 rounded-xl border text-[10px] font-bold tracking-widest flex items-center gap-2.5
                            ${isPending ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                isSuccess ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10' :
                                    'bg-red-500/10 text-red-500 border-red-500/10'}`}>
                            {isPending ? <Clock size={12} className="animate-pulse" strokeWidth={3} /> : isSuccess ? <CheckCircle2 size={12} strokeWidth={3} /> : <ShieldAlert size={12} strokeWidth={3} />}
                            <span className="uppercase">{status === 'pending' ? 'Processing' : status}</span>
                        </div>
                        <div className="flex items-baseline gap-2 mt-4 overflow-hidden">
                            <span className={`text-4xl font-bold tracking-tight truncate ${isPending ? 'text-white' : isSuccess ? 'text-emerald-400' : 'text-red-400'}`}>
                                {Number(item.actualReceipt).toLocaleString()}
                            </span>
                            <span className="text-[11px] font-bold text-indigo-400/60 uppercase tracking-widest shrink-0">ETB Net</span>
                        </div>
                    </div>

                    <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center p-3 shadow-xl border border-white/5 group-hover:scale-105 transition-transform shrink-0">
                        {item.bankDetails?.bankLogoUrl ? (
                            <img src={item.bankDetails.bankLogoUrl} alt="Bank" className="w-full h-full object-contain" />
                        ) : (
                            <Building2 className="text-slate-200" size={32} />
                        )}
                    </div>
                </div>

                {/* Financial Ledger */}
                <div className="space-y-3">
                    <div className="bg-white/[0.02] rounded-2xl p-6 flex justify-between items-center border border-white/5 group-hover:border-indigo-500/10 transition-all">
                        <span className="text-xs font-semibold text-white/30">Withdraw Amount</span>
                        <span className="text-sm font-bold text-white tabular-nums tracking-wide">{Number(item.amount).toLocaleString()} ETB</span>
                    </div>
                    <div className="bg-white/[0.02] rounded-2xl p-6 flex justify-between items-center border border-white/5">
                        <span className="text-xs font-semibold text-white/30">Service Fee</span>
                        <span className="text-sm font-bold text-red-500/60 tabular-nums tracking-wide">-{Number(item.fee).toLocaleString()} ETB</span>
                    </div>
                </div>

                {/* Destination Details */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-2.5">
                            <Wallet size={14} className="text-indigo-500/40" />
                            <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Destination</span>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/5 px-3 py-1 rounded-lg border border-indigo-500/10">{item.bankDetails?.bankName}</span>
                    </div>
                    <div className="bg-indigo-600 rounded-3xl p-8 shadow-[0_15px_40px_rgba(79,70,229,0.25)] flex flex-col items-center gap-3 relative overflow-hidden group/bank">
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/bank:opacity-100 transition-opacity duration-500"></div>
                        <span className="text-xl font-bold text-white tracking-[0.2em] font-mono leading-none break-all text-center relative z-10">
                            {item.bankDetails?.accountNumber}
                        </span>
                        <div className="flex items-center gap-2 relative z-10">
                            <span className="text-[10px] font-bold text-white/60 tracking-tight">Holder: {item.bankDetails?.holderName}</span>
                        </div>
                    </div>
                </div>

                {/* Verification Footer */}
                <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 bg-white/5 px-4 py-1.5 rounded-xl border border-white/5">
                        <Calendar size={14} className="text-white/20" />
                        <span className="text-[10px] font-bold text-white/30">
                            {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : new Date(item.createdAt).toLocaleDateString()}
                        </span>
                    </div>

                    {isSuccess ? (
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-[10px] uppercase tracking-widest">
                            <CheckCircle2 size={14} strokeWidth={3} />
                            <span>Completed</span>
                        </div>
                    ) : isPending ? (
                        <div className="flex items-center gap-2 text-indigo-400 font-bold text-[10px] uppercase tracking-widest animate-pulse">
                            <Clock size={14} strokeWidth={3} />
                            <span>Processing</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-red-500 font-bold text-[10px] uppercase tracking-widest">
                            <XCircle size={14} strokeWidth={3} />
                            <span>Rejected</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
