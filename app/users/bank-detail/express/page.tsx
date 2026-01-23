"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection } from "firebase/firestore";
import { ChevronLeft, Copy, Loader2, ArrowRight, Zap, Flag, Gauge, Timer, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

function ExpressContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const amount = searchParams.get("amount") || "0";
    const methodId = searchParams.get("methodId");

    const [loading, setLoading] = useState(true);
    const [method, setMethod] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState(600);
    const [smsContent, setSmsContent] = useState("");
    const [copiedAccount, setCopiedAccount] = useState(false);
    const [copiedName, setCopiedName] = useState(false);

    useEffect(() => {
        const fetchMethod = async () => {
            if (!methodId) return;
            try {
                const docRef = doc(db, "paymentMethods", methodId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) setMethod(docSnap.data());
            } catch (error) { toast.error("Speed Error: Load Failed"); }
            finally { setLoading(false); }
        };
        fetchMethod();
    }, [methodId]);

    useEffect(() => {
        if (timeLeft <= 0) return;
        const intervalId = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
        return () => clearInterval(intervalId);
    }, [timeLeft]);

    const { m, s } = { m: Math.floor(timeLeft / 60), s: timeLeft % 60 };

    const handleCopy = (text: string, type: 'account' | 'name') => {
        navigator.clipboard.writeText(text);
        toast.success("Fast-Copy Success");

        if (type === 'account') {
            setCopiedAccount(true);
            setTimeout(() => setCopiedAccount(false), 2000);
        } else {
            setCopiedName(true);
            setTimeout(() => setCopiedName(false), 2000);
        }
    };

    const handleSubmit = async () => {
        if (!smsContent.trim()) {
            toast.error("Finish Line Error: Data Required");
            return;
        }

        try {
            const user = auth.currentUser;
            if (!user) {
                toast.error("Auth Required");
                return;
            }

            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            const userPhone = userDocSnap.exists() ? userDocSnap.data()?.phoneNumber : "";

            await addDoc(collection(db, "RechargeReview"), {
                paymentMethod: "express",
                bankName: method?.bankName || "",
                phoneNumber: userPhone || user.phoneNumber || "",
                amount: Number(amount),
                FTcode: smsContent,
                accountHolderName: method?.holderName || "",
                accountNumber: method?.accountNumber || "",
                status: "Under Review",
                userId: user.uid,
                timestamp: new Date()
            });

            toast.success("Transmission Complete: Turbo Active");
            router.push("/users/transaction-pending?theme=express");
        } catch (error) {
            console.error(error);
            toast.error("Engine Stall: Retry");
        }
    };

    if (loading) return <div className="min-h-screen bg-[#F0F3F7] flex items-center justify-center"><Loader2 className="animate-spin text-[#0047AB]" /></div>;

    return (
        <div className="min-h-screen bg-[#F0F3F7] text-[#1A1A1A] font-sans pb-44 px-6 relative overflow-x-hidden">
            {/* Background Racing Stripes */}
            <div className="fixed inset-0 pointer-events-none opacity-5">
                <div className="absolute top-0 left-[20%] w-24 h-full bg-gradient-to-b from-[#0047AB] to-transparent skew-x-[-15deg]"></div>
                <div className="absolute top-0 left-[40%] w-12 h-full bg-gradient-to-b from-[#FF4500] to-transparent skew-x-[-15deg]"></div>
            </div>

            {/* Performance Header */}
            <header className="pt-10 pb-12 flex flex-col gap-8 relative z-10 max-w-lg mx-auto">
                <div className="flex items-center justify-between">
                    <button onClick={() => router.back()} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl active:scale-95 transition-all text-[#0047AB] border-b-4 border-[#0047AB]/20 hover:border-[#0047AB]">
                        <ChevronLeft size={24} strokeWidth={3} />
                    </button>
                    <div className="flex bg-[#1A1A1A] p-1 rounded-2xl shadow-xl">
                        <div className="px-5 py-2 flex items-center gap-3">
                            <Timer size={18} className="text-[#FF4500]" />
                            <span className="font-mono font-black tabular-nums text-xl text-white">
                                {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-2 bg-[#0047AB] text-white px-4 py-1.5 rounded-full shadow-lg shadow-[#0047AB]/20">
                        <Flag size={14} className="fill-current" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Active Circuit</span>
                    </div>
                    <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none text-[#1A1A1A]">Velocity Pay</h1>
                </div>
            </header>

            <main className="space-y-10 relative z-10 max-w-lg mx-auto">
                {/* Total Value Cluster */}
                <section className="animate-in fade-in slide-in-from-top-12 duration-700">
                    <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl border-b-8 border-[#0047AB] flex items-center justify-between relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#0047AB]/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
                        <div className="space-y-1 relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#B2BEC3]">Session Volume</p>
                            <span className="text-5xl font-black italic tracking-tighter text-[#1A1A1A]">
                                {Number(amount).toLocaleString()}
                            </span>
                        </div>
                        <div className="bg-[#FF4500] text-white px-4 py-8 flex items-center justify-center rounded-2xl transform skew-x-[-12deg] relative z-10">
                            <span className="font-black skew-x-[12deg] text-lg">ETB</span>
                        </div>
                    </div>
                </section>

                {/* Logistics Section */}
                <section className="space-y-6 animate-in fade-in slide-in-from-bottom-12 duration-700 delay-200">
                    <div className="flex items-center gap-4 px-2">
                        <Gauge size={22} className="text-[#0047AB]" />
                        <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#636E72]">Settlement Logistics</h2>
                        <div className="h-[2px] flex-1 bg-gradient-to-r from-[#0047AB] to-transparent"></div>
                    </div>

                    <div className="grid gap-6">
                        {/* Merchant Identity */}
                        <div className="bg-white rounded-3xl p-6 border-l-[10px] border-[#0047AB] shadow-lg flex items-center justify-between">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 bg-[#F0F3F7] rounded-2xl flex items-center justify-center p-2">
                                    {method?.bankLogoUrl ? (
                                        <img src={method.bankLogoUrl} className="w-full h-full object-contain" alt="Engine" />
                                    ) : (
                                        <Building2Icon className="w-8 h-8 text-[#0047AB]/30" />
                                    )}
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-black uppercase text-[#B2BEC3] tracking-widest">Target Vault</p>
                                    <p className="font-black text-xl italic text-[#1A1A1A]">{method?.bankName || "CBE_CORE"}</p>
                                </div>
                            </div>
                            <CheckCircle2 size={24} className="text-[#0047AB] opacity-20" />
                        </div>

                        {/* Copy Nodes */}
                        <div className="grid gap-4">
                            {/* Node A: Holder */}
                            <div className="bg-[#1A1A1A] text-white rounded-3xl p-6 shadow-xl flex items-center justify-between group">
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-[8px] font-black uppercase text-white/30 tracking-[0.4em] mb-2 font-mono">/ BENEFICIARY_MAP /</p>
                                    <p className="font-black text-lg truncate pr-4">{method?.holderName || "ZEN_LOGISTICS_HUB"}</p>
                                </div>
                                <button
                                    onClick={() => handleCopy(method?.holderName, 'name')}
                                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shrink-0 ${copiedName ? 'bg-emerald-500 scale-110' : 'bg-[#FF4500] hover:bg-[#FF4500]/80 shadow-[0_10px_20px_-5px_rgba(255,69,0,0.4)]'}`}
                                >
                                    {copiedName ? <CheckCircle2 size={24} strokeWidth={3} /> : <div className="font-black text-[10px] uppercase skew-y-[-5deg]">Copy</div>}
                                </button>
                            </div>

                            {/* Node B: Account */}
                            <div className="bg-white rounded-[2.5rem] p-8 border-2 border-dashed border-[#0047AB]/20 flex flex-col gap-6 group hover:border-[#0047AB] transition-all">
                                <div className="flex justify-between items-start w-full">
                                    <div>
                                        <p className="text-[8px] font-black uppercase text-[#B2BEC3] tracking-[0.4em] mb-2 font-mono">/ STRING_ADDRESS /</p>
                                        <p className="font-black text-3xl font-mono tracking-[0.1em] text-[#0047AB] tabular-nums">{method?.accountNumber || "00000000"}</p>
                                    </div>
                                    <Zap size={20} className="text-[#FF4500] animate-pulse" />
                                </div>
                                <button
                                    onClick={() => handleCopy(method?.accountNumber, 'account')}
                                    className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] transition-all flex items-center justify-center gap-3 ${copiedAccount ? 'bg-emerald-500 text-white' : 'bg-[#0047AB] text-white shadow-xl shadow-[#0047AB]/20 hover:-translate-y-1'}`}
                                >
                                    {copiedAccount ? <CheckCircle2 size={18} strokeWidth={3} /> : <Copy size={18} />}
                                    <span>{copiedAccount ? 'Sequence Copied' : 'Extract Account Number'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Telemetry Input */}
                <section className="space-y-6 animate-in fade-in slide-in-from-bottom-12 duration-700 delay-300 pb-20">
                    <div className="flex items-center gap-4 px-2">
                        <ArrowRightIcon className="w-5 h-5 text-[#FF4500]" />
                        <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#636E72]">Transmission Proof</h2>
                    </div>

                    <div className="relative group">
                        <textarea
                            value={smsContent}
                            onChange={(e) => setSmsContent(e.target.value)}
                            placeholder="UPLINK: Paste transaction telemetry here... DATA_SIGNAL_PENDING..."
                            className="w-full h-40 bg-white rounded-[2rem] p-8 border-4 border-transparent focus:border-[#0047AB] shadow-2xl text-[#1A1A1A] placeholder:text-[#B2BEC3] focus:outline-none text-base font-black italic transition-all resize-none font-mono"
                        />
                        <div className="absolute right-6 bottom-6 flex gap-1 items-center bg-[#F0F3F7] p-2 rounded-lg">
                            <div className="w-1.5 h-1.5 bg-[#FF4500] rounded-full animate-ping"></div>
                            <span className="text-[8px] font-black uppercase tracking-tighter text-[#0047AB]">Ready</span>
                        </div>
                    </div>
                </section>
            </main>

            {/* Launch Action Control */}
            <div className="fixed bottom-0 left-0 right-0 p-8 pb-14 bg-gradient-to-t from-[#F0F3F7] via-[#F0F3F7] to-transparent z-50">
                <div className="max-w-lg mx-auto">
                    <button
                        onClick={handleSubmit}
                        disabled={!smsContent.trim()}
                        className="w-full h-24 bg-black text-white rounded-3xl font-black uppercase tracking-[0.4em] text-[10px] shadow-2xl transition-all active:scale-[0.96] flex items-center justify-center gap-6 group relative overflow-hidden disabled:opacity-20 disabled:grayscale"
                    >
                        <div className="absolute top-0 right-0 w-2 h-full bg-[#FF4500] group-hover:w-4 transition-all"></div>
                        <div className="absolute top-0 left-0 w-8 h-full bg-[#0047AB] opacity-20"></div>
                        <Zap size={20} className="text-[#FF4500] group-hover:scale-125 transition-transform" />
                        <span className="relative z-10 italic">Activate_Speed_Settlement</span>
                        <ArrowRight size={24} className="relative z-10 group-hover:translate-x-3 transition-transform duration-500" />
                    </button>
                    <p className="text-[7px] font-black uppercase tracking-[0.6em] text-[#B2BEC3] text-center mt-10 opacity-50 select-none">Turbo Optimized • 24Hz Refresh • SEC_LOCK</p>
                </div>
            </div>

            <WelcomeNotification method={method} />
        </div>
    );
}

function Building2Icon({ className }: { className?: string }) {
    return (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6h1.5m-1.5 3h1.5m-1.5 3h1.5M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
        </svg>
    )
}

function ArrowRightIcon({ className }: { className?: string }) {
    return (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={4} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
    )
}

function WelcomeNotification({ method }: { method: any }) {
    const [show, setShow] = useState(true);
    const [animateOut, setAnimateOut] = useState(false);

    const handleDismiss = () => {
        setAnimateOut(true);
        setTimeout(() => setShow(false), 500);
    };

    if (!show) return null;

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#1A1A1A]/95 backdrop-blur-3xl transition-opacity duration-500 ${animateOut ? 'opacity-0' : 'opacity-100'}`}>
            <div className={`bg-white rounded-[3rem] p-12 max-w-sm w-full border-b-[20px] border-[#0047AB] shadow-2xl relative overflow-hidden transition-all duration-700 ${animateOut ? 'scale-110 rotate-3 opacity-0' : 'scale-100 opacity-100 animate-in zoom-in-95'}`}>
                {/* Visual Racing Lines */}
                <div className="absolute top-0 left-0 w-2 h-full bg-[#FF4500]"></div>

                <div className="relative z-10 flex flex-col items-center text-center gap-10">
                    <div className="relative">
                        <div className="absolute inset-0 bg-[#0047AB]/20 rounded-full blur-2xl animate-pulse"></div>
                        <div className="w-24 h-24 bg-black rounded-3xl flex items-center justify-center text-white transform rotate-12 group hover:rotate-0 transition-transform duration-500">
                            <Zap size={48} strokeWidth={2.5} className="fill-[#FF4500] text-[#FF4500]" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-[#0047AB]">Circuit Access</h3>
                        <p className="text-4xl font-black italic tracking-tighter text-[#1A1A1A] leading-none">Express_Gateway</p>
                    </div>

                    <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#B2BEC3]/30 to-transparent"></div>

                    <p className="text-[#636E72] text-[11px] font-black italic leading-relaxed uppercase tracking-tighter px-2">
                        Welcome to <span className="text-[#0047AB] underline decoration-[#FF4500] decoration-2">Zen_Speed_Shop</span>. You've selected the <span className="text-[#1A1A1A] font-black italic">{method?.bankDetailType || "Express"}</span> protocol. High-performance partner funding is now online.
                    </p>

                    <button
                        onClick={handleDismiss}
                        className="w-full bg-[#1A1A1A] text-white font-black uppercase tracking-[0.3em] text-[10px] py-6 shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-4 group overflow-hidden"
                    >
                        <span>Ignition_Start</span>
                        <ArrowRight size={20} className="text-[#FF4500] group-hover:translate-x-2 transition-transform" />
                    </button>

                    <p className="text-[7px] font-black uppercase text-[#B2BEC3] opacity-50 tracking-[0.4em]">Sub_Second_Latency_Active</p>
                </div>
            </div>
        </div>
    );
}

export default function ExpressBankDetailPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#F0F3F7] flex items-center justify-center"><Loader2 className="animate-spin text-[#0047AB]" /></div>}>
            <ExpressContent />
        </Suspense>
    );
}
