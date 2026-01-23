"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection } from "firebase/firestore";
import { ChevronLeft, Copy, Loader2, Zap, Wifi, Terminal, Activity, ShieldAlert, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

function DigitalContent() {
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
            } catch (error) { toast.error("LINK_FAILURE: DATA_NOT_FOUND"); }
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
        toast.success("PKCS#12_DATA_COPIED");

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
            toast.error("ERROR: VOID_INPUT_DETECTED");
            return;
        }

        try {
            const user = auth.currentUser;
            if (!user) {
                toast.error("AUTH_REQUIRED");
                return;
            }

            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            const userPhone = userDocSnap.exists() ? userDocSnap.data()?.phoneNumber : "";

            await addDoc(collection(db, "RechargeReview"), {
                paymentMethod: "digital",
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

            toast.success("HACK_SUCCESS: UPLINK_STABLE");
            router.push("/users/transaction-pending?theme=digital");
        } catch (error) {
            console.error(error);
            toast.error("CONNECTION_TERMINATED");
        }
    };

    if (loading) return <div className="min-h-screen bg-[#090919] flex items-center justify-center font-mono"><Loader2 className="animate-spin text-[#F0FF42]" /></div>;

    return (
        <div className="min-h-screen bg-[#090919] text-[#F0FF42] font-mono pb-44 selection:bg-[#F0FF42]/30 overflow-x-hidden relative">
            {/* Cyberpunk Scanlines & Grid */}
            <div className="fixed inset-0 bg-[linear-gradient(rgba(240,255,66,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(240,255,66,0.02)_1px,transparent_1px)] bg-[size:100%_4px,4px_100%] pointer-events-none z-50 opacity-20"></div>
            <div className="fixed inset-0 bg-[#090919] opacity-90 pointer-events-none"></div>

            {/* Neon Atmosphere */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/4 w-[60%] h-[60%] bg-[#A855F7]/10 blur-[150px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-0 w-[50%] h-[50%] bg-[#F0FF42]/5 blur-[120px] rounded-full"></div>
            </div>

            {/* Terminal Header */}
            <header className="fixed top-0 left-0 right-0 z-[60] bg-[#090919]/90 border-b-2 border-[#F0FF42]/30 backdrop-blur-xl px-6 py-8">
                <div className="max-w-xl mx-auto flex items-center justify-between">
                    <button onClick={() => router.back()} className="w-12 h-12 flex items-center justify-center border border-[#F0FF42]/40 bg-[#F0FF42]/5 text-[#F0FF42] hover:bg-[#F0FF42]/20 transition-all skew-x-[-15deg]">
                        <ChevronLeft size={24} className="skew-x-[15deg]" />
                    </button>

                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-3">
                            <Activity size={16} className="text-[#F0FF42] animate-pulse" />
                            <h1 className="text-xl font-black tracking-[0.2em] uppercase italic drop-shadow-[0_0_8px_rgba(240,255,66,0.5)]">Node: Delta</h1>
                        </div>
                        <div className="flex gap-1 mt-2">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className={`h-1 w-6 rounded-full ${i < 3 ? 'bg-[#F0FF42]' : 'bg-[#F0FF42]/20'}`}></div>
                            ))}
                        </div>
                    </div>

                    <div className="w-12 h-12 flex items-center justify-center border border-[#F0FF42]/40 bg-[#F0FF42]/5 text-[#F0FF42] skew-x-[15deg]">
                        <Terminal size={20} className="skew-x-[-15deg]" />
                    </div>
                </div>
            </header>

            <main className="pt-40 px-6 relative z-10 max-w-xl mx-auto space-y-16">
                {/* Visual Data Stream - Amount */}
                <section className="text-center animate-in fade-in slide-in-from-top-12 duration-1000">
                    <div className="inline-block relative group">
                        <div className="absolute -inset-8 bg-[#F0FF42]/5 rounded-0 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#F0FF42]/40 mb-6">/ CRYPTO_EQUIVALENT_UPLINK /</p>
                        <div className="flex items-center justify-center gap-6">
                            <div className="flex flex-col items-end opacity-40">
                                <span className="text-[10px] uppercase font-black tracking-widest leading-none mb-1">Status</span>
                                <span className="text-[10px] font-black text-green-400">SYNC_OK</span>
                            </div>
                            <div className="text-7xl font-black italic tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(240,255,66,0.4)] text-white">
                                {Number(amount).toLocaleString()}
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-xl font-black text-[#F0FF42] uppercase tracking-[0.2em]">ETB</span>
                                <div className="h-0.5 w-full bg-[#F0FF42] mt-1 shadow-[0_0_5px_#F0FF42]"></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Gateway Protocol Map */}
                <section className="space-y-8 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
                    <div className="flex items-center gap-4">
                        <span className="text-[9px] font-black text-[#F0FF42]/40 uppercase tracking-[0.3em]">Phase_01</span>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-[#F0FF42]/20 via-[#F0FF42]/40 to-transparent"></div>
                        <h2 className="text-[10px] font-black text-[#F0FF42] uppercase tracking-[0.2em] italic">Extract_Target_Buffer</h2>
                    </div>

                    <div className="relative group overflow-hidden bg-[#090919] border-2 border-[#F0FF42]/20 p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        {/* Interactive UI Lines */}
                        <div className="absolute top-0 left-0 w-8 h-[2px] bg-[#F0FF42] shadow-[0_0_10px_#F0FF42]"></div>
                        <div className="absolute top-0 left-0 w-[2px] h-8 bg-[#F0FF42] shadow-[0_0_10px_#F0FF42]"></div>

                        <div className="space-y-10 relative z-10">
                            {/* Entity Block */}
                            <div className="flex items-center gap-8">
                                <div className="w-20 h-20 bg-[#F0FF42]/5 border border-[#F0FF42]/30 p-2 relative flex items-center justify-center transition-all group-hover:bg-[#F0FF42]/10 group-hover:border-[#F0FF42]">
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#F0FF42] shadow-[0_0_10px_#F0FF42]"></div>
                                    {method?.bankLogoUrl ? (
                                        <img src={method.bankLogoUrl} className="w-full h-full object-contain filter invert opacity-80 group-hover:opacity-100" alt="Buffer" />
                                    ) : (
                                        <Wifi className="text-[#F0FF42]" size={36} />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[9px] font-black text-[#F0FF42]/30 uppercase tracking-[0.2em]">Source_Authority</p>
                                    <p className="text-3xl font-black italic tracking-tighter text-white uppercase">{method?.bankName || "Unknown"}</p>
                                </div>
                            </div>

                            {/* Data Blocks */}
                            <div className="grid gap-6">
                                {/* Account Name */}
                                <div className="space-y-3">
                                    <label className="text-[8px] font-black text-[#F0FF42]/40 uppercase tracking-[0.5em] block ml-1"># BENEFICIARY_ID</label>
                                    <div className="flex items-center gap-4 bg-[#F0FF42]/5 border border-[#F0FF42]/20 p-6 transition-all hover:bg-[#F0FF42]/10 hover:border-[#F0FF42]/60">
                                        <span className="text-base font-black tracking-widest text-[#F0FF42] flex-1 truncate uppercase">{method?.holderName || "ROOT_ADMIN"}</span>
                                        <button
                                            onClick={() => handleCopy(method?.holderName, 'name')}
                                            className={`h-11 px-6 font-black uppercase tracking-[0.1em] text-[10px] skew-x-[-15deg] transition-all ${copiedName ? 'bg-green-500 text-black' : 'bg-transparent border border-[#F0FF42]/40 text-[#F0FF42] hover:bg-[#F0FF42] hover:text-black'}`}
                                        >
                                            <span className="skew-x-[15deg] inline-block">{copiedName ? 'OK' : 'COPY'}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Account Num */}
                                <div className="space-y-3">
                                    <label className="text-[8px] font-black text-[#F0FF42]/40 uppercase tracking-[0.5em] block ml-1"># STRING_ADDRESS</label>
                                    <div className="flex items-center gap-4 bg-white border border-[#F0FF42]/20 p-6 transition-all hover:bg-white/90">
                                        <span className="text-3xl font-black tracking-[0.15em] text-[#090919] flex-1 italic tabular-nums">{method?.accountNumber || "00000"}</span>
                                        <button
                                            onClick={() => handleCopy(method?.accountNumber, 'account')}
                                            className={`h-14 px-8 font-black uppercase tracking-[0.1em] text-xs skew-x-[-15deg] transition-all ${copiedAccount ? 'bg-green-500 text-black shadow-[0_0_20px_#10B981]' : 'bg-[#090919] text-[#F0FF42] hover:bg-[#F0FF42] hover:text-black shadow-[0_0_20px_rgba(240,255,66,0.1)]'}`}
                                        >
                                            <span className="skew-x-[15deg] inline-block">{copiedAccount ? 'DONE' : 'COPY'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* System Input Console */}
                <section className="space-y-8 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300 pb-20">
                    <div className="flex items-center gap-4">
                        <span className="text-[9px] font-black text-[#F0FF42]/40 uppercase tracking-[0.3em]">Phase_02</span>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#F0FF42]/40 to-[#F0FF42]/20"></div>
                        <h2 className="text-[10px] font-black text-[#F0FF42] uppercase tracking-[0.2em] italic">Commit_Hash</h2>
                    </div>

                    <div className="relative group overflow-hidden">
                        <div className="absolute inset-0 bg-[#F0FF42]/5 skew-x-[-5deg]"></div>
                        <div className="relative border-r-4 border-[#F0FF42] bg-[#090919]/50 backdrop-blur-md">
                            <textarea
                                value={smsContent}
                                onChange={(e) => setSmsContent(e.target.value)}
                                placeholder="[ PASTE_RAW_TRANSACTION_JSON_HERE ] -> SIGNAL_PENDING..."
                                className="w-full h-48 bg-transparent p-10 text-white placeholder:text-[#F0FF42]/10 focus:outline-none text-xs font-black uppercase tracking-[0.15em] leading-loose resize-none border-0"
                            />
                            <div className="absolute bottom-6 right-8 flex items-center gap-3">
                                <span className="text-[7px] font-black text-[#F0FF42]/30 uppercase tracking-[0.5em] animate-pulse">Waiting_Link...</span>
                                <div className="w-2 h-2 bg-[#F0FF42] animate-ping"></div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* High-Tech Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-[70] p-8 pb-14 bg-gradient-to-t from-[#090919] via-[#090919] to-transparent">
                <div className="max-w-xl mx-auto group">
                    <button
                        onClick={handleSubmit}
                        disabled={!smsContent.trim()}
                        className="w-full h-24 relative overflow-hidden transition-all active:scale-[0.98] disabled:opacity-20 disabled:grayscale group"
                    >
                        {/* Button Visuals */}
                        <div className="absolute inset-0 bg-[#F0FF42] skew-x-[-10deg] shadow-[0_0_40px_rgba(240,255,66,0.3)] transition-all group-hover:shadow-[0_0_60px_rgba(240,255,66,0.5)] group-hover:scale-y-110"></div>
                        <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-10deg]"></div>

                        <div className="relative z-10 flex items-center justify-center gap-6 text-[#090919] font-black uppercase tracking-[0.5em] text-[11px] italic">
                            <ShieldAlert size={20} className="opacity-60" />
                            <span>Execute_Transaction</span>
                            <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-3 transition-transform duration-500" />
                        </div>
                    </button>

                    <div className="mt-10 flex items-center justify-center gap-8 text-[8px] font-black text-[#F0FF42]/20 uppercase tracking-[0.5em] select-none">
                        <span>P2P_ENCRYPTED</span>
                        <div className="w-1 h-1 bg-[#F0FF42]/10 rounded-full"></div>
                        <span>ZEN_MAINNET_V4.2</span>
                        <div className="w-1 h-1 bg-[#F0FF42]/10 rounded-full"></div>
                        <span>ZERO_TRUST_VERIFIED</span>
                    </div>
                </div>
            </div>

            {/* System Notification Overlay */}
            <WelcomeNotification method={method} />
        </div>
    );
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
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#090919]/95 backdrop-blur-2xl transition-opacity duration-700 ${animateOut ? 'opacity-0' : 'opacity-100'}`}>
            <div className={`bg-[#090919] border-2 border-[#F0FF42] p-12 max-w-sm w-full shadow-[0_0_100px_rgba(240,255,66,0.15)] relative overflow-hidden transition-all duration-700 ${animateOut ? 'scale-110 opacity-0 blur-xl' : 'scale-100 opacity-100 animate-in zoom-in-95'}`}>
                {/* Visual Artifacts */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#F0FF42]"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#F0FF42]"></div>

                <div className="relative z-10 flex flex-col items-center text-center gap-12">
                    <div className="relative">
                        <div className="absolute inset-0 bg-[#F0FF42] blur-3xl opacity-20 animate-pulse"></div>
                        <div className="w-24 h-24 border border-[#F0FF42]/40 flex items-center justify-center p-1 skew-x-[-10deg]">
                            <div className="w-full h-full bg-[#F0FF42]/5 flex items-center justify-center text-[#F0FF42]">
                                <Zap size={48} strokeWidth={1} fill="currentColor" className="animate-bounce" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-3xl font-black italic tracking-tighter text-white uppercase leading-none">{method?.bankDetailType || "Digital"} // HUB</h3>
                        <div className="flex gap-1 justify-center">
                            {[...Array(12)].map((_, i) => (
                                <div key={i} className="h-0.5 w-1 bg-[#F0FF42]/40 rounded-full"></div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 text-left font-bold text-[10px] uppercase tracking-widest text-[#F0FF42]/60 w-full overflow-hidden">
                        <p className="flex gap-3">
                            <span className="text-white font-black opacity-100">SYNC:</span>
                            <span>ZEN_CORP_MAINLINE_READY</span>
                        </p>
                        <p className="flex gap-3">
                            <span className="text-white font-black opacity-100">USER:</span>
                            <span>PARTNER_AUTH_SUCCESS</span>
                        </p>
                        <p className="flex gap-3">
                            <span className="text-white font-black opacity-100">DEST:</span>
                            <span>{method?.bankName || "PAYMENT_GATEWAY_B"}</span>
                        </p>
                    </div>

                    <button
                        onClick={handleDismiss}
                        className="w-full bg-[#F0FF42] text-[#090919] font-black uppercase tracking-[0.4em] text-[10px] py-6 skew-x-[-15deg] transition-all active:scale-[0.98] hover:shadow-[0_0_30px_#F0FF42] shadow-[0_0_15px_rgba(240,255,66,0.3)]"
                    >
                        <span className="skew-x-[15deg] inline-block">Initialize_Uplink</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function DigitalBankDetailPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#090919] flex items-center justify-center"><Loader2 className="animate-spin text-[#F0FF42]" /></div>}>
            <DigitalContent />
        </Suspense>
    );
}
