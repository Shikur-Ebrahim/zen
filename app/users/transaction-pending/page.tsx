"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import {
    ChevronLeft,
    ShieldCheck,
    Clock,
    Loader2,
    Home,
    HeadphonesIcon,
    Zap,
    Crown,
    ArrowRightLeft,
    ShieldAlert,
    Activity,
    Cpu,
    Database,
    Fingerprint
} from "lucide-react";



const LOG_MESSAGES = [
    "Establishing secure gateway...",
    "Fetching account data...",
    "Authenticating request...",
    "Validating transfer details...",
    "Processing security verification...",
    "Cross-referencing records...",
    "Synchronizing secure nodes...",
    "Internal security audit...",
    "Awaiting team approval..."
];

function PendingContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [currentLog, setCurrentLog] = useState(0);

    useEffect(() => {
        setMounted(true);
    }, []);

    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        if (!mounted) return;
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribeAuth();
    }, [mounted]);

    useEffect(() => {
        if (!mounted || !user) return;

        const type = searchParams.get("type");
        const collectionName = type === "withdrawal" ? "Withdrawals" : "RechargeReview";

        const q = query(
            collection(db, collectionName),
            where("userId", "==", user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
                docs.sort((a, b) => {
                    const timeA = (a.timestamp || a.createdAt)?.toMillis?.() || 0;
                    const timeB = (b.timestamp || b.createdAt)?.toMillis?.() || 0;
                    return timeB - timeA;
                });

                const latestTx = docs[0];
                if (latestTx?.status === 'verified' || latestTx?.status === 'approved' || latestTx?.status === 'success') {
                    if (type === "withdrawal") {
                        router.push("/users/profile");
                    } else {
                        router.push("/users/welcome?tab=product");
                    }
                }
            }
        });

        return () => unsubscribe();
    }, [user, router, searchParams, mounted]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentLog(prev => (prev < LOG_MESSAGES.length - 1 ? prev + 1 : prev));
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    if (!mounted) {
        return (
            <div className="min-h-screen bg-[#050510] flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-indigo-500 w-10 h-10" />
                <span className="text-indigo-500/60 font-medium text-xs animate-pulse tracking-widest">Initialising Secure Channel...</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050510] text-white font-sans selection:bg-indigo-500/30 selection:text-white transition-colors duration-1000 relative overflow-hidden flex flex-col">
            {/* Background Atmosphere */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-violet-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-[#050510] via-transparent to-[#050510] opacity-80"></div>
            </div>

            {/* Header */}
            <header className="px-6 py-6 flex justify-between items-center relative z-10">
                <button
                    onClick={() => router.push("/users/welcome")}
                    className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all active:scale-90 shadow-2xl backdrop-blur-xl"
                >
                    <ChevronLeft size={24} />
                </button>
                <div className="px-5 py-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] font-bold tracking-widest text-indigo-400 shadow-xl backdrop-blur-xl flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                    Zen Secure {searchParams.get('type') === 'withdrawal' ? 'W-72' : 'R-10'}
                </div>
                <div className="w-12"></div>
            </header>

            <main className="flex-1 px-6 flex flex-col items-center justify-center relative z-10 max-w-lg mx-auto w-full pb-40">

                {/* Advanced Scanner */}
                <div className="relative mb-16 group">
                    {/* Ring Animations */}
                    <div className="absolute inset-[-40px] border border-indigo-500/5 rounded-full animate-[ping_4s_ease-in-out_infinite]"></div>
                    <div className="absolute inset-[-20px] border border-violet-500/10 rounded-full animate-[spin_10s_linear_infinite] border-dashed"></div>

                    <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
                        {/* Glow Gradient */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-600/20 via-transparent to-violet-600/20 animate-spin"></div>

                        {/* Glass Core */}
                        <div className="absolute inset-4 rounded-full bg-black/40 border border-white/10 backdrop-blur-3xl shadow-[0_0_50px_rgba(79,70,229,0.1)] flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.1),transparent_70%)]"></div>

                            <div className="relative flex flex-col items-center gap-4">
                                <div className="p-6 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/20">
                                    <ShieldCheck size={64} className="text-indigo-400 animate-pulse" strokeWidth={1.5} />
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center gap-2">
                                        <Loader2 size={16} className="animate-spin text-indigo-400" />
                                        <span className="text-[10px] font-bold tracking-[0.3em] text-indigo-400/80 uppercase">Processing</span>
                                    </div>
                                    <span className="text-[9px] font-mono text-white/20">SEQ: {Math.random().toString(36).substring(7).toUpperCase()}</span>
                                </div>
                            </div>

                            {/* Scanning Light Effect */}
                            <div className="absolute top-0 left-0 right-0 h-[100px] bg-gradient-to-b from-indigo-500/20 to-transparent animate-[scan_3s_ease-in-out_infinite] opacity-50"></div>
                        </div>
                    </div>
                </div>

                {/* Status Content */}
                <div className="text-center space-y-8 w-full">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"></span>
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-100"></span>
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-200"></span>
                            </div>
                            <span className="text-xs font-bold text-indigo-400 tracking-wide">
                                Status: {searchParams.get('type') === 'withdrawal' ? 'Pending Approval' : 'Under Review'}
                            </span>
                        </div>

                        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
                            Security <br />
                            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-500 bg-clip-text text-transparent italic">Verification</span>
                        </h1>

                        <p className="text-sm sm:text-base text-gray-400 max-w-[300px] mx-auto leading-relaxed">
                            Processing your request through our secure network.
                            Approximate wait time: <span className="text-white font-bold underline decoration-indigo-500 underline-offset-4">5-10 Mins</span>
                        </p>
                    </div>

                    {/* Progress Logs */}
                    <div className="w-full bg-black/40 border border-white/5 rounded-[2.5rem] p-8 text-left backdrop-blur-3xl shadow-2xl relative overflow-hidden group/logs transition-all hover:border-indigo-500/20">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover/logs:opacity-10 transition-opacity">
                            <Activity size={48} className="text-indigo-500" />
                        </div>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                                <Cpu size={18} />
                            </div>
                            <h3 className="text-xs font-bold tracking-widest text-indigo-400/80 uppercase">Processing Nodes</h3>
                        </div>

                        <div className="space-y-4 font-mono">
                            {LOG_MESSAGES.slice(0, currentLog + 1).map((msg, idx) => (
                                <div key={idx} className={`flex items-start gap-3 text-[11px] transition-all duration-500 ${idx === currentLog ? 'translate-x-1 opacity-100' : 'opacity-30'}`}>
                                    <span className="text-indigo-500">{`>`}</span>
                                    <span className={idx === currentLog ? "text-white" : "text-gray-500"}>
                                        {msg}
                                        {idx === currentLog && <span className="inline-block w-1.5 h-3 bg-indigo-500 animate-pulse ml-2"></span>}
                                    </span>
                                    {idx === currentLog && (
                                        <span className="ml-auto text-[9px] font-bold text-indigo-500 animate-pulse">ACTIVE</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            {/* Bottom Action */}
            <div className="fixed bottom-0 left-0 right-0 p-6 pb-12 bg-gradient-to-t from-[#050510] via-[#050510]/95 to-transparent z-20">
                <div className="max-w-lg mx-auto">
                    <button
                        onClick={() => router.push("/users/welcome")}
                        className="w-full bg-white text-black py-6 rounded-[2rem] font-bold tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3 group"
                    >
                        <Home size={18} className="group-hover:translate-y-[-2px] transition-transform" />
                        <span>Return Home</span>
                    </button>
                </div>
            </div>

            <style jsx global>{`
                @keyframes scan {
                    0% { transform: translateY(-100%); opacity: 0; }
                    50% { opacity: 0.5; }
                    100% { transform: translateY(150%); opacity: 0; }
                }
            `}</style>
        </div>
    );
}

export default function TransactionPendingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#050810] flex flex-col items-center justify-center gap-4"><Loader2 className="animate-spin text-blue-500 w-10 h-10" /><span className="text-blue-500 font-mono text-xs animate-pulse">BOOTING PROTOCOL...</span></div>}>
            <PendingContent />
        </Suspense>
    );
}
