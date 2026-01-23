"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection } from "firebase/firestore";
import { ChevronLeft, Building2, Copy, Loader2, CheckCircle2, Waves, Zap } from "lucide-react";
import { toast } from "sonner";

function RegularBankDetailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const amount = searchParams.get("amount") || "0";
    const methodId = searchParams.get("methodId");

    const [loading, setLoading] = useState(true);
    const [method, setMethod] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
    const [smsContent, setSmsContent] = useState("");
    const [copiedAccount, setCopiedAccount] = useState(false);
    const [copiedName, setCopiedName] = useState(false);

    useEffect(() => {
        const fetchMethod = async () => {
            if (!methodId) return;
            try {
                const docRef = doc(db, "paymentMethods", methodId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setMethod(docSnap.data());
                }
            } catch (error) {
                console.error("Error fetching method:", error);
                toast.error("Failed to load payment details");
            } finally {
                setLoading(false);
            }
        };

        fetchMethod();
    }, [methodId]);

    useEffect(() => {
        if (timeLeft <= 0) return;
        const intervalId = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(intervalId);
    }, [timeLeft]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return { m, s };
    };

    const { m, s } = formatTime(timeLeft);

    const handleCopy = (text: string, type: 'account' | 'name') => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");

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
            toast.error("Please enter SMS content or FT code");
            return;
        }

        try {
            const user = auth.currentUser;
            if (!user) {
                toast.error("Please login first");
                return;
            }

            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            const userPhone = userDocSnap.exists() ? userDocSnap.data()?.phoneNumber : "";

            await addDoc(collection(db, "RechargeReview"), {
                paymentMethod: "regular",
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

            toast.success("Submitted successfully! Under review.");
            router.push("/users/transaction-pending?theme=regular");
        } catch (error) {
            console.error("Submission error:", error);
            toast.error("Failed to submit. Please try again.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F4F7F6]">
                <Loader2 className="w-10 h-10 animate-spin text-[#00C9A7]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F4F7F6] text-[#2D3436] font-sans pb-32 overflow-x-hidden">
            {/* Header Area - Vibrant Mint Gradient */}
            <div className="bg-gradient-to-br from-[#00C9A7] to-[#00A896] text-white pt-8 pb-16 px-6 relative rounded-b-[3rem] shadow-lg">
                <div className="absolute top-[-10%] right-[-5%] opacity-10">
                    <Waves size={200} strokeWidth={1} />
                </div>

                <header className="flex items-center justify-between relative z-10 mb-8">
                    <button onClick={() => router.back()} className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30 transition-all">
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="text-xl font-black tracking-tight uppercase">Transfer Hub</h1>
                    <div className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30">
                        <Zap size={20} />
                    </div>
                </header>

                <div className="flex flex-col items-center gap-4 relative z-10">
                    <div className="flex items-center gap-2 bg-black/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                        <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Awaiting Verification</span>
                    </div>

                    <div className="flex items-baseline gap-2 tabular-nums">
                        <span className="text-5xl font-black">{String(m).padStart(1, '0')}</span>
                        <span className="text-2xl font-black opacity-50">:</span>
                        <span className="text-5xl font-black">{String(s).padStart(2, '0')}</span>
                        <span className="text-xs font-bold uppercase tracking-widest ml-1 opacity-70">Remaining</span>
                    </div>
                </div>
            </div>

            <main className="px-6 -mt-8 relative z-20 space-y-8 max-w-md mx-auto">
                {/* Amount Card - Clean Silver Style */}
                <section className="animate-in fade-in slide-in-from-top-6 duration-700">
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-[#00C9A7]/5 border border-[#E1E4E8] flex flex-col items-center text-center">
                        <p className="text-[10px] font-black text-[#636E72] uppercase tracking-[0.3em] mb-4">You are paying</p>
                        <div className="flex items-center gap-3">
                            <span className="text-5xl font-black text-[#2D3436] tracking-tighter">
                                {Number(amount).toLocaleString()}
                            </span>
                            <div className="h-8 w-1 bg-[#00C9A7] rounded-full"></div>
                            <span className="text-xl font-black text-[#00C9A7] uppercase tracking-widest">ETB</span>
                        </div>
                    </div>
                </section>

                {/* Bank Details */}
                <section className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                    <div className="flex items-center gap-3 px-2">
                        <span className="w-10 h-10 rounded-xl bg-[#00C9A7]/10 flex items-center justify-center text-[#00C9A7] font-black text-sm shadow-inner">01</span>
                        <h2 className="text-xs font-black text-[#636E72] uppercase tracking-widest">Beneficiary Account</h2>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-8 shadow-lg shadow-[#00C9A7]/5 border border-[#E1E4E8] space-y-8">
                        {/* Bank Name */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-[#F4F7F6] flex items-center justify-center p-2 border border-[#E1E4E8]">
                                    {method?.bankLogoUrl ? (
                                        <img src={method.bankLogoUrl} className="w-full h-full object-contain" alt="Bank" />
                                    ) : (
                                        <Building2 className="text-[#00C9A7]/30" size={32} />
                                    )}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-[#B2BEC3] uppercase tracking-widest mb-1">Financial Entity</p>
                                    <p className="font-black text-lg text-[#2D3436] leading-none">{method?.bankName || "CBE"}</p>
                                </div>
                            </div>
                            <CheckCircle2 className="text-[#00C9A7]" size={24} />
                        </div>

                        {/* Account Details Group */}
                        <div className="grid gap-6">
                            {/* Holder */}
                            <div className="bg-[#F4F7F6] rounded-[2rem] p-6 border border-[#E1E4E8] flex items-center justify-between group transition-all hover:border-[#00C9A7]/30">
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-[#B2BEC3] uppercase tracking-widest mb-1">Receiver Name</p>
                                    <p className="font-black text-[#2D3436] break-words">{method?.holderName || "ZEN PERFUME"}</p>
                                </div>
                                <button
                                    onClick={() => handleCopy(method?.holderName, 'name')}
                                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${copiedName ? 'bg-[#00C9A7] text-white' : 'bg-white border border-[#E1E4E8] text-[#00C9A7] hover:bg-[#00C9A7]/5'}`}
                                >
                                    {copiedName ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                                </button>
                            </div>

                            {/* Account Num */}
                            <div className="bg-[#2D3436] rounded-[2rem] p-6 shadow-2xl flex items-center justify-between">
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Account Number</p>
                                    <p className="font-black text-2xl text-white tracking-widest tabular-nums">{method?.accountNumber || "123456789"}</p>
                                </div>
                                <button
                                    onClick={() => handleCopy(method?.accountNumber, 'account')}
                                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${copiedAccount ? 'bg-[#00C9A7] text-white' : 'bg-white/10 text-[#00C9A7] hover:bg-white/20'}`}
                                >
                                    {copiedAccount ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Input Step */}
                <section className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 pb-10">
                    <div className="flex items-center gap-3 px-2">
                        <span className="w-10 h-10 rounded-xl bg-[#636E72]/10 flex items-center justify-center text-[#636E72] font-black text-sm shadow-inner">02</span>
                        <h2 className="text-xs font-black text-[#636E72] uppercase tracking-widest">Payment Proof</h2>
                    </div>

                    <div className="relative group">
                        <textarea
                            value={smsContent}
                            onChange={(e) => setSmsContent(e.target.value)}
                            placeholder="Paste the transaction SMS here or manually enter the TID..."
                            className="w-full h-40 bg-white rounded-[2.5rem] p-8 border border-[#E1E4E8] text-[#2D3436] placeholder:text-[#B2BEC3] focus:outline-none focus:border-[#00C9A7] focus:ring-4 focus:ring-[#00C9A7]/5 transition-all shadow-lg shadow-[#00C9A7]/5 text-sm font-medium leading-relaxed resize-none"
                        />
                        <div className="absolute top-6 right-8 opacity-20 group-focus-within:opacity-100 transition-opacity">
                            <Zap size={20} className="text-[#00C9A7]" />
                        </div>
                    </div>
                </section>
            </main>

            {/* Bottom Button Area */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl p-6 pb-10 border-t border-[#E1E4E8] z-50">
                <div className="max-w-md mx-auto">
                    <button
                        onClick={handleSubmit}
                        disabled={!smsContent.trim()}
                        className="w-full h-20 bg-[#00C9A7] hover:bg-[#00B894] disabled:bg-[#B2BEC3] disabled:opacity-50 text-white rounded-[2.2rem] font-black uppercase tracking-[0.25em] text-sm shadow-xl shadow-[#00C9A7]/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                        Confirm Transaction
                        <ArrowRightIcon className="w-5 h-5" />
                    </button>
                    <p className="text-[8px] font-black text-[#B2BEC3] uppercase tracking-[0.5em] text-center mt-6">Instant Protocol • Guaranteed Safety</p>
                </div>
            </div>

            <WelcomeNotification method={method} />
        </div>
    );
}

function ArrowRightIcon({ className }: { className?: string }) {
    return (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={3.5} stroke="currentColor" className={className}>
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
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#2D3436]/60 backdrop-blur-xl transition-opacity duration-500 ${animateOut ? 'opacity-0' : 'opacity-100'}`}>
            <div className={`bg-white rounded-[3.5rem] p-10 max-w-sm w-full shadow-[0_32px_80px_rgba(0,0,0,0.1)] relative overflow-hidden transition-all duration-500 ${animateOut ? 'scale-90 opacity-0' : 'scale-100 opacity-100 animate-in zoom-in-95'}`}>
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#00C9A7]/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#00A896]/5 rounded-full blur-3xl -ml-16 -mb-16"></div>

                <div className="relative z-10 flex flex-col items-center text-center gap-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-[#00C9A7] to-[#00A896] rounded-[2.5rem] flex items-center justify-center text-white shadow-xl shadow-[#00C9A7]/30 transform -rotate-6">
                        <Building2 size={48} strokeWidth={1.5} />
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-3xl font-black text-[#2D3436] tracking-tighter uppercase italic leading-none">Standard<br />Protocol</h3>
                        <p className="text-[#636E72] text-sm font-bold uppercase tracking-widest leading-relaxed">
                            Zen Perfume Partner Access Initialized.
                        </p>
                        <div className="h-1 w-12 bg-[#00C9A7] mx-auto rounded-full"></div>
                    </div>

                    <p className="text-[#B2BEC3] text-xs font-medium leading-relaxed px-4">
                        You've selected the <span className="text-[#00C9A7] font-black uppercase tracking-widest text-[10px]">{method?.bankDetailType || "Regular"} gate</span>.
                        Your partnership settlement details are ready for confirmation.
                    </p>

                    <button
                        onClick={handleDismiss}
                        className="w-full h-16 bg-[#2D3436] hover:bg-black text-white font-black uppercase tracking-[0.25em] text-[10px] rounded-2xl transition-all active:scale-95 shadow-2xl"
                    >
                        Open Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function RegularBankDetailPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F4F7F6]"><Loader2 className="animate-spin text-[#00C9A7]" /></div>}>
            <RegularBankDetailContent />
        </Suspense>
    );
}
