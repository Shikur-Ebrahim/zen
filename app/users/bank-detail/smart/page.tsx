"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection } from "firebase/firestore";
import {
    ChevronLeft,
    Copy,
    Loader2,
    Leaf,
    Sparkles,
    Wand2,
    Wallet,
    ArrowRightLeft,
    Sprout,
    Sun,
    CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

function SmartContent() {
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
            } catch (error) { toast.error("Connection failed"); }
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
        toast.success("Details saved");

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
            toast.error("Please provide transaction details");
            return;
        }

        try {
            const user = auth.currentUser;
            if (!user) {
                toast.error("Not authenticated");
                return;
            }

            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            const userPhone = userDocSnap.exists() ? userDocSnap.data()?.phoneNumber : "";

            await addDoc(collection(db, "RechargeReview"), {
                paymentMethod: "smart",
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

            toast.success("Contribution registered");
            router.push("/users/transaction-pending?theme=smart");
        } catch (error) {
            console.error(error);
            toast.error("Submission error");
        }
    };

    if (loading) return <div className="min-h-screen bg-[#F5F2ED] flex items-center justify-center"><Loader2 className="animate-spin text-[#8A9A5B]" /></div>;

    return (
        <div className="min-h-screen bg-[#F5F2ED] text-[#2D342B] font-sans pb-48 px-6 relative overflow-x-hidden selection:bg-[#B4C1A5]/40">
            {/* Background Atmosphere */}
            <div className="fixed inset-0 pointer-events-none opacity-60">
                <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[50%] bg-[#B4C1A5]/20 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-0 left-0 w-[60%] h-[50%] bg-[#CC5500]/5 blur-[100px] rounded-full"></div>
            </div>

            {/* Header */}
            <header className="pt-10 pb-8 flex flex-col items-center gap-6 relative z-10 max-w-lg mx-auto">
                <div className="w-full flex justify-between items-center">
                    <button onClick={() => router.back()} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#4A5D4E] shadow-sm hover:shadow-md transition-all active:scale-95 border border-[#E8DCC4]">
                        <ChevronLeft size={24} strokeWidth={2} />
                    </button>
                    <div className="flex flex-col items-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#8A9A5B]">Secure Settlement</p>
                        <h1 className="text-xl font-black text-[#2D342B] tracking-tight uppercase">Smart Gateway</h1>
                    </div>
                    <div className="w-12 h-12 bg-[#8A9A5B] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#8A9A5B]/20">
                        <Sprout size={20} />
                    </div>
                </div>

                <div className="bg-white/60 backdrop-blur-md border border-[#E8DCC4] px-6 py-2.5 rounded-full flex items-center gap-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Sun size={14} className="text-[#CC5500] animate-[spin_8s_linear_infinite]" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#4A5D4E]/60">Link Valid For</span>
                    </div>
                    <div className="w-px h-3 bg-[#4A5D4E]/10"></div>
                    <span className="font-mono font-bold text-[#2D342B] tracking-widest text-lg tabular-nums">
                        {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
                    </span>
                </div>
            </header>

            <main className="space-y-10 relative z-10 max-w-lg mx-auto">
                {/* Amount Display */}
                <section className="animate-in fade-in slide-in-from-top-8 duration-700">
                    <div className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-[#8A9A5B]/5 flex flex-col items-center gap-2 border border-[#E8DCC4]">
                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#8A9A5B]">Settlement Amount</p>
                        <div className="flex items-center gap-4">
                            <h2 className="text-6xl font-black tracking-tighter text-[#2D342B]">
                                {Number(amount).toLocaleString()}
                            </h2>
                            <span className="text-sm font-black text-[#CC5500] bg-[#CC5500]/10 px-3 py-1 rounded-lg">ETB</span>
                        </div>
                    </div>
                </section>

                {/* Account Details */}
                <section className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                    <div className="flex items-center gap-3 px-2">
                        <Leaf size={16} className="text-[#8A9A5B]" />
                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#4A5D4E]/40">Recipient Protocol</h2>
                    </div>

                    <div className="bg-white rounded-[3rem] p-8 space-y-8 border border-[#E8DCC4] shadow-lg">
                        <div className="flex items-center gap-5 pb-6 border-b border-[#F5F2ED]">
                            <div className="w-14 h-14 bg-[#F5F2ED] rounded-2xl flex items-center justify-center p-2.5 border border-[#E8DCC4]">
                                {method?.bankLogoUrl ? (
                                    <img src={method.bankLogoUrl} className="w-full h-full object-contain" alt="Bank" />
                                ) : (
                                    <Wallet className="text-[#8A9A5B]/20" size={28} />
                                )}
                            </div>
                            <div>
                                <p className="text-[8px] font-black text-[#8A9A5B] uppercase tracking-widest mb-1">Target Institution</p>
                                <p className="text-xl font-bold text-[#2D342B] tracking-tight">{method?.bankName || "CBE"}</p>
                            </div>
                        </div>

                        <div className="grid gap-6">
                            <div className="space-y-2">
                                <p className="text-[8px] font-black text-[#B4C1A5] uppercase tracking-widest ml-1">Account Holder</p>
                                <div className="bg-[#F5F2ED] rounded-2xl p-5 flex items-center justify-between border border-[#E8DCC4] group transition-all hover:bg-white">
                                    <span className="font-bold text-[#4A5D4E] flex-1 truncate pr-4">{method?.holderName || "ZEN PARTNER"}</span>
                                    <button
                                        onClick={() => handleCopy(method?.holderName, 'name')}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${copiedName ? 'bg-[#8A9A5B] text-white shadow-lg' : 'bg-white text-[#8A9A5B] border border-[#E8DCC4] hover:bg-[#8A9A5B]/5'}`}
                                    >
                                        {copiedName ? 'Saved' : 'copy'}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 text-[#F5F2ED]">
                                <p className="text-[8px] font-black text-[#B4C1A5] uppercase tracking-widest ml-1">Address Code</p>
                                <div className="bg-[#4A5D4E] rounded-3xl p-6 flex flex-col gap-4 shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
                                    <div className="flex items-center justify-between relative z-10">
                                        {/* Fixed Truncation: Using break-all instead of truncate */}
                                        <p className="text-3xl font-black tracking-widest tabular-nums break-all leading-tight pr-4">
                                            {method?.accountNumber || "000000"}
                                        </p>
                                        <button
                                            onClick={() => handleCopy(method?.accountNumber, 'account')}
                                            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0 ${copiedAccount ? 'bg-[#B4C1A5] text-[#4A5D4E]' : 'bg-white/10 text-white/40 hover:bg-white/20'}`}
                                        >
                                            {copiedAccount ? <CheckCircle2 size={24} strokeWidth={3} /> : <Copy size={24} strokeWidth={1.5} />}
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => handleCopy(method?.accountNumber, 'account')}
                                        className="w-full py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] bg-white text-[#4A5D4E] shadow-xl active:scale-[0.98] transition-all"
                                    >
                                        Quick Copy Account Number
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 pb-20">
                    <div className="flex items-center gap-3 px-2">
                        <Wand2 size={16} className="text-[#CC5500]" />
                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#4A5D4E]/40">Manual Trace Proof</h2>
                    </div>

                    <div className="relative">
                        <textarea
                            value={smsContent}
                            onChange={(e) => setSmsContent(e.target.value)}
                            placeholder="Enter the TID or paste transaction confirmation here..."
                            className="w-full h-40 bg-white rounded-[2.5rem] p-8 border border-[#E8DCC4] text-[#2D342B] placeholder:text-[#B4C1A5] focus:outline-none focus:border-[#8A9A5B]/30 transition-all shadow-lg text-sm font-medium leading-relaxed resize-none"
                        />
                    </div>
                </section>
            </main>

            {/* Bottom Button */}
            <div className="fixed bottom-0 left-0 right-0 p-8 pb-12 bg-gradient-to-t from-[#F5F2ED] via-[#F5F2ED] to-transparent z-50">
                <div className="max-w-lg mx-auto">
                    <button
                        onClick={handleSubmit}
                        disabled={!smsContent.trim()}
                        className="w-full h-20 bg-[#2D342B] hover:bg-black text-[#F5F2ED] rounded-[2.2rem] font-black uppercase tracking-[0.4em] text-[10px] shadow-2xl transition-all active:scale-[0.97] flex items-center justify-center gap-5 disabled:opacity-30 disabled:grayscale"
                    >
                        <span>Process Settlement</span>
                        <div className="w-10 h-10 bg-[#8A9A5B] rounded-xl flex items-center justify-center text-white">
                            <ArrowRightLeft size={18} />
                        </div>
                    </button>
                    <p className="text-[8px] font-black tracking-[0.4em] text-[#B4C1A5] uppercase text-center mt-8">Organic Data Flow • Encrypted Path • Zen</p>
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
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#2D342B]/40 backdrop-blur-xl transition-opacity duration-500 ${animateOut ? 'opacity-0' : 'opacity-100'}`}>
            <div className={`bg-white rounded-[3.5rem] p-10 max-w-sm w-full shadow-2xl relative overflow-hidden transition-all duration-500 border border-[#E8DCC4] ${animateOut ? 'scale-90 opacity-0' : 'scale-100 opacity-100 animate-in zoom-in-95'}`}>
                <div className="relative z-10 flex flex-col items-center text-center gap-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#8A9A5B] to-[#B4C1A5] rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-[#8A9A5B]/20 transform rotate-3">
                        <Sparkles size={36} strokeWidth={1.5} />
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-[#8A9A5B] uppercase tracking-[0.5em]">System Initialized</h3>
                        <p className="text-3xl font-black text-[#2D342B] tracking-tight lowercase">smart partner</p>
                    </div>

                    <p className="text-[#636E72] text-[11px] font-medium leading-relaxed px-2">
                        Welcome to <span className="text-[#8A9A5B] font-black">Smart Zen</span>. Your selected path is rooted in efficiency. Follow the nodes to complete your contribution.
                    </p>

                    <button
                        onClick={handleDismiss}
                        className="w-full h-16 bg-[#2D342B] text-white font-black uppercase tracking-[0.3em] text-[10px] rounded-2xl transition-all active:scale-95 shadow-xl"
                    >
                        Open Portal
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function SmartBankDetailPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F5F2ED]"><Loader2 className="animate-spin text-[#8A9A5B]" /></div>}>
            <SmartContent />
        </Suspense>
    );
}
