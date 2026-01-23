"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection } from "firebase/firestore";
import {
    ChevronLeft,
    Copy,
    Loader2,
    ShieldCheck,
    Lock,
    CheckCircle2,
    ShieldAlert,
    Activity,
    Shield,
    ArrowRight
} from "lucide-react";
import { toast } from "sonner";

function SecureContent() {
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
            } catch (error) { toast.error("SECURE_ACCESS_ERROR"); }
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
        if (!text) return;
        navigator.clipboard.writeText(text);
        toast.success("SECUREly_COPIED");

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
            toast.error("DATA_REQUIRED");
            return;
        }

        try {
            const user = auth.currentUser;
            if (!user) {
                toast.error("SESSION_INVALID");
                return;
            }

            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            const userPhone = userDocSnap.exists() ? userDocSnap.data()?.phoneNumber : "";

            await addDoc(collection(db, "RechargeReview"), {
                paymentMethod: "secure",
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

            toast.success("TRANSACTION_LOGGED");
            router.push("/users/transaction-pending?theme=secure");
        } catch (error) {
            console.error(error);
            toast.error("UPLINK_FAILURE");
        }
    };

    if (loading) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><Loader2 className="animate-spin text-[#FDD017]" /></div>;

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-[#F0F0F0] font-sans pb-44 selection:bg-[#FDD017]/30 relative overflow-x-hidden">
            {/* Security Backdrop */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,rgba(253,208,23,0.05),transparent_70%)] pointer-events-none"></div>

            {/* Advanced Header */}
            <header className="bg-black border-b border-white/10 px-6 pt-12 pb-14 relative z-50">
                <div className="max-w-lg mx-auto flex items-center justify-between">
                    <button onClick={() => router.back()} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-[#FDD017] hover:bg-white/10 transition-all active:scale-90 border border-white/10">
                        <ChevronLeft size={24} strokeWidth={2} />
                    </button>

                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#FDD017] animate-pulse"></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FDD017]">Protected Zone</span>
                        </div>
                        <h1 className="text-xl font-black uppercase tracking-tight text-white italic">Vault.Secure</h1>
                    </div>

                    <div className="w-12 h-12 bg-[#FDD017]/10 rounded-2xl flex items-center justify-center text-[#FDD017]">
                        <ShieldCheck size={24} />
                    </div>
                </div>
            </header>

            <main className="px-6 -mt-6 relative z-10 max-w-lg mx-auto space-y-10">
                {/* Timer & Amount - Luxury Secure Card */}
                <section className="animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="bg-[#1A1A1A] rounded-[2.5rem] p-8 border border-white/10 shadow-2xl flex flex-col items-center gap-6">
                        <div className="flex items-center gap-4 bg-black/40 px-6 py-2 rounded-full border border-white/5">
                            <Activity size={12} className="text-green-500" />
                            <span className="text-sm font-mono font-bold text-white tracking-widest tabular-nums">
                                {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
                            </span>
                        </div>

                        <div className="text-center group">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-2">Total Amount</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-6xl font-black tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                                    {Number(amount).toLocaleString()}
                                </span>
                                <span className="text-[#FDD017] font-black text-xs uppercase tracking-widest">ETB</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Secure Data Cluster */}
                <section className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                    <div className="flex items-center gap-3 px-2">
                        <Lock size={16} className="text-[#FDD017]" />
                        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Encryption Mapping</h2>
                    </div>

                    <div className="bg-[#1A1A1A] rounded-[3rem] p-8 border border-white/10 shadow-2xl space-y-8">
                        {/* Bank Identification */}
                        <div className="flex items-center gap-5 pb-8 border-b border-white/5">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-2.5 shadow-[0_10px_30px_rgba(255,255,255,0.1)]">
                                {method?.bankLogoUrl ? (
                                    <img src={method.bankLogoUrl} className="w-full h-full object-contain" alt="Institution" />
                                ) : (
                                    <Shield size={32} className="text-black/20" />
                                )}
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-[#FDD017] uppercase tracking-widest mb-1">Target Authority</p>
                                <p className="text-xl font-bold text-white tracking-tight uppercase italic">{method?.bankName || "Unknown"}</p>
                            </div>
                        </div>

                        {/* Nodes */}
                        <div className="space-y-8">
                            {/* Beneficiary Node */}
                            <div className="space-y-3">
                                <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.4em] ml-1"># Beneficiary_ID</p>
                                <div className="bg-black/40 rounded-2xl p-6 flex items-center justify-between border border-white/5 group hover:border-[#FDD017]/30 transition-all">
                                    <span className="font-bold text-white tracking-wide truncate pr-4">{method?.holderName || "ROOT_HOLDER"}</span>
                                    <button
                                        onClick={() => handleCopy(method?.holderName, 'name')}
                                        className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${copiedName ? 'bg-green-500 text-black shadow-lg shadow-green-500/20' : 'bg-white/5 text-[#FDD017] border border-[#FDD017]/20 hover:bg-[#FDD017]/10'}`}
                                    >
                                        {copiedName ? 'Saved' : 'copy'}
                                    </button>
                                </div>
                            </div>

                            {/* Account Node - No Truncation */}
                            <div className="space-y-3">
                                <p className="text-[8px] font-black text-[#FDD017]/30 uppercase tracking-[0.4em] ml-1"># Secure_Address</p>
                                <div className="bg-white rounded-3xl p-8 flex flex-col gap-6 shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-black/5 rounded-full blur-2xl"></div>
                                    <div className="flex items-center justify-between relative z-10">
                                        <p className="text-3xl font-black text-black tracking-widest tabular-nums break-all leading-tight">
                                            {method?.accountNumber || "00000000"}
                                        </p>
                                        <button
                                            onClick={() => handleCopy(method?.accountNumber, 'account')}
                                            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shrink-0 ${copiedAccount ? 'bg-[#FDD017] text-black shadow-lg' : 'bg-black text-[#FDD017] hover:scale-110 active:scale-95'}`}
                                        >
                                            {copiedAccount ? <CheckCircle2 size={24} strokeWidth={3} /> : <Copy size={24} strokeWidth={1.5} />}
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => handleCopy(method?.accountNumber, 'account')}
                                        className="w-full py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] bg-black text-white shadow-xl hover:bg-[#FDD017] hover:text-black transition-all"
                                    >
                                        Extract Address
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Input Protocol */}
                <section className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 pb-20">
                    <div className="flex items-center gap-3 px-2">
                        <ShieldAlert size={16} className="text-[#FDD017]" />
                        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Transmission Proof</h2>
                    </div>

                    <div className="relative">
                        <textarea
                            value={smsContent}
                            onChange={(e) => setSmsContent(e.target.value)}
                            placeholder="PASTE_TRANSACTION_ID_OR_SMS_HERE_FOR_FINAL_COMMITTAL..."
                            className="w-full h-40 bg-[#1A1A1A] rounded-[2.5rem] p-8 border border-white/5 text-white placeholder:text-white/10 focus:outline-none focus:border-[#FDD017]/30 transition-all shadow-lg text-sm font-medium leading-relaxed resize-none font-mono"
                        />
                    </div>
                </section>
            </main>

            {/* Fixed Action Control */}
            <div className="fixed bottom-0 left-0 right-0 p-8 pb-12 bg-gradient-to-t from-black via-black/80 to-transparent z-[60]">
                <div className="max-w-lg mx-auto">
                    <button
                        onClick={handleSubmit}
                        disabled={!smsContent.trim()}
                        className="w-full h-22 bg-[#FDD017] hover:bg-white text-black rounded-[2.2rem] font-black uppercase tracking-[0.4em] text-[11px] shadow-[0_15px_40px_rgba(253,208,23,0.2)] transition-all active:scale-[0.97] flex items-center justify-center gap-6 disabled:opacity-20 disabled:grayscale"
                    >
                        <Lock size={20} strokeWidth={3} />
                        <span>Commit Settlement</span>
                        <ArrowRight size={20} className="opacity-40" />
                    </button>
                    <p className="text-[7px] font-black tracking-[0.6em] text-white/20 uppercase text-center mt-10">Structural Security Protocol • Zen Vault V4.2</p>
                </div>
            </div>

            <WelcomeNotification method={method} />
        </div>
    );
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
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl transition-opacity duration-700 ${animateOut ? 'opacity-0' : 'opacity-100'}`}>
            <div className={`bg-[#1A1A1A] rounded-[4rem] p-12 max-w-sm w-full border border-white/10 shadow-2xl relative overflow-hidden transition-all duration-700 ${animateOut ? 'scale-110 opacity-0 blur-lg' : 'scale-100 opacity-100 animate-in zoom-in-95'}`}>
                <div className="relative z-10 flex flex-col items-center text-center gap-10">
                    <div className="w-24 h-24 bg-gradient-to-br from-[#FDD017] to-[#D4A18F] rounded-[2.5rem] flex items-center justify-center text-black shadow-2xl shadow-[#FDD017]/20 transform -rotate-6">
                        <Lock size={44} strokeWidth={2.5} />
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-[#FDD017] uppercase tracking-[0.5em]">Auth: Secure_Sector</h3>
                        <p className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">Mainframe.Access</p>
                    </div>

                    <p className="text-[#E1E4E8]/60 text-[11px] font-medium leading-relaxed italic px-2">
                        Welcome to <span className="text-white font-bold tracking-widest italic">Zen.Vault</span>. You've entered a high-security settlement zone. Please verify all nodes to finalize your transfer.
                    </p>

                    <button
                        onClick={handleDismiss}
                        className="w-full h-18 bg-[#FDD017] text-black font-black uppercase tracking-[0.4em] text-[10px] rounded-3xl transition-all active:scale-95 shadow-2xl"
                    >
                        Initialize Authorize
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function SecureBankDetailPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><Loader2 className="animate-spin text-[#FDD017]" /></div>}>
            <SecureContent />
        </Suspense>
    );
}
