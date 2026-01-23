"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection } from "firebase/firestore";
import { ChevronLeft, Copy, Loader2, Crown, ShieldCheck, Clock, CheckCircle2, Heart } from "lucide-react";
import { toast } from "sonner";

function PremiumContent() {
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
        const intervalId = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
        return () => clearInterval(intervalId);
    }, [timeLeft]);

    const { m, s } = { m: Math.floor(timeLeft / 60), s: timeLeft % 60 };

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
                paymentMethod: "premium",
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
            router.push("/users/transaction-pending?theme=premium");
        } catch (error) {
            console.error("Submission error:", error);
            toast.error("Failed to submit. Please try again.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#2D0B18]">
                <Loader2 className="w-10 h-10 animate-spin text-[#E5B2A0]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#2D0B18] text-[#F9F4F2] font-serif pb-44 px-6 relative overflow-x-hidden">
            {/* Elegant Background Patterns */}
            <div className="fixed inset-0 pointer-events-none opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#E5B2A0]/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#E5B2A0]/10 rounded-full blur-[100px]"></div>
            </div>

            {/* Premium Header */}
            <header className="pt-10 pb-8 flex flex-col items-center gap-6 relative z-10 border-b border-[#E5B2A0]/20 max-w-lg mx-auto">
                <div className="w-full flex justify-between items-center">
                    <button onClick={() => router.back()} className="w-12 h-12 rounded-full border border-[#E5B2A0]/30 flex items-center justify-center text-[#E5B2A0] hover:bg-[#E5B2A0]/10 transition-all active:scale-95">
                        <ChevronLeft size={24} strokeWidth={1.5} />
                    </button>
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2">
                            <Crown size={16} className="text-[#E5B2A0]" />
                            <span className="text-[10px] uppercase font-black tracking-[0.4em] text-[#E5B2A0]/80">Imperial Settlement</span>
                        </div>
                        <h1 className="text-2xl font-black italic tracking-tighter text-[#E5B2A0] mt-1">Premium Flow</h1>
                    </div>
                    <div className="w-12 h-12 rounded-full border border-[#E5B2A0]/30 flex items-center justify-center text-[#E5B2A0]">
                        <Heart size={20} fill="currentColor" className="opacity-40" />
                    </div>
                </div>

                {/* Exquisite Timer */}
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-6">
                        <div className="w-px h-10 bg-gradient-to-t from-transparent via-[#E5B2A0]/40 to-transparent"></div>
                        <div className="text-center">
                            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#E5B2A0]/40 mb-2">Valid Until</p>
                            <div className="flex items-baseline gap-2 font-black italic text-4xl tabular-nums drop-shadow-lg">
                                <span>{String(m).padStart(2, '0')}</span>
                                <span className="animate-pulse opacity-40">:</span>
                                <span>{String(s).padStart(2, '0')}</span>
                            </div>
                        </div>
                        <div className="w-px h-10 bg-gradient-to-t from-transparent via-[#E5B2A0]/40 to-transparent"></div>
                    </div>
                </div>
            </header>

            <main className="pt-12 space-y-12 max-w-lg mx-auto relative z-10">
                {/* Amount Display - Artisan Style */}
                <section className="animate-in fade-in slide-in-from-top-6 duration-1000">
                    <div className="relative group text-center">
                        <div className="absolute -inset-8 bg-[#E5B2A0]/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <p className="text-[10px] uppercase font-black tracking-[0.3em] text-[#E5B2A0]/60 mb-3">Recharge Value</p>
                        <div className="flex items-center justify-center gap-3">
                            <span className="text-7xl font-black tracking-tighter tabular-nums text-white">
                                {Number(amount).toLocaleString()}
                            </span>
                            <span className="text-sm font-black italic text-[#E5B2A0] uppercase tracking-widest bg-[#E5B2A0]/10 px-3 py-1 rounded-lg">ETB</span>
                        </div>
                    </div>
                </section>

                {/* Bank Card - Velvet Design */}
                <section className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                    <div className="flex items-center gap-4 px-2">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#E5B2A0]/20"></div>
                        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#E5B2A0]">Account Profile</h2>
                        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#E5B2A0]/20"></div>
                    </div>

                    <div className="bg-[#3D141F] rounded-[3rem] p-10 shadow-2xl border border-[#E5B2A0]/10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-[#E5B2A0]/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-[#E5B2A0]/10 transition-all duration-700"></div>

                        <div className="flex items-center gap-6 mb-12 relative z-10">
                            <div className="w-20 h-20 rounded-[2rem] bg-white p-2 shadow-2xl transform group-hover:scale-105 transition-transform duration-500">
                                {method?.bankLogoUrl ? (
                                    <img src={method.bankLogoUrl} className="w-full h-full object-contain" alt="Bank" />
                                ) : (
                                    <ShieldCheck className="text-[#2D0B18]" size={48} />
                                )}
                            </div>
                            <div className="flex-1">
                                <h4 className="text-2xl font-black italic tracking-tighter uppercase leading-none">{method?.bankName || "National Bank"}</h4>
                                <p className="text-[10px] font-black text-[#E5B2A0]/60 uppercase tracking-widest mt-2 flex items-center gap-2">
                                    <div className="w-1 h-1 bg-emerald-400 rounded-full"></div>
                                    Priority Merchant Gateway
                                </p>
                            </div>
                        </div>

                        <div className="space-y-8 relative z-10">
                            <div className="flex justify-between items-end border-b border-[#E5B2A0]/10 pb-6 group/item">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase text-[#E5B2A0]/40 tracking-widest">Beneficiary</p>
                                    <p className="text-lg font-black tracking-tight">{method?.holderName || "ZEN PARTNER"}</p>
                                </div>
                                <button
                                    onClick={() => handleCopy(method?.holderName, 'name')}
                                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${copiedName ? 'bg-emerald-500 text-white' : 'bg-[#E5B2A0]/10 text-[#E5B2A0] hover:bg-[#E5B2A0]/20'}`}
                                >
                                    {copiedName ? 'Copied' : 'copy'}
                                </button>
                            </div>

                            <div className="flex justify-between items-end group/item">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase text-[#E5B2A0]/40 tracking-widest">IBAN / Account Number</p>
                                    <p className="text-3xl font-black italic tracking-[0.1em] text-[#E5B2A0] tabular-nums whitespace-nowrap">{method?.accountNumber || "0000 0000 0000"}</p>
                                </div>
                                <button
                                    onClick={() => handleCopy(method?.accountNumber, 'account')}
                                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${copiedAccount ? 'bg-[#E5B2A0] text-[#2D0B18]' : 'bg-[#E5B2A0]/10 text-[#E5B2A0] hover:bg-[#E5B2A0]/20'}`}
                                >
                                    <Copy size={24} strokeWidth={1.5} />
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Confirmation Flow */}
                <section className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 pb-20">
                    <div className="text-center">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#E5B2A0]/60 mb-6">Validation Record</h2>
                    </div>

                    <div className="relative group p-[1px] rounded-[3rem] bg-gradient-to-b from-[#E5B2A0]/40 to-transparent">
                        <div className="bg-[#2D0B18] rounded-[2.95rem] p-10">
                            <textarea
                                value={smsContent}
                                onChange={(e) => setSmsContent(e.target.value)}
                                placeholder="Please paste your official transaction SMS here for authentic processing..."
                                className="w-full h-44 bg-transparent text-[#F9F4F2] placeholder:text-[#E5B2A0]/20 focus:outline-none text-base italic leading-relaxed font-medium resize-none"
                            />
                            <div className="pt-6 border-t border-[#E5B2A0]/10 flex justify-between items-center opacity-40">
                                <Clock size={16} />
                                <span className="text-[8px] font-bold uppercase tracking-widest">Authorized Area Only</span>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Premium Button */}
            <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#2D0B18] via-[#2D0B18] to-transparent p-8 pb-12 z-50">
                <div className="max-w-lg mx-auto">
                    <button
                        onClick={handleSubmit}
                        disabled={!smsContent.trim()}
                        className="w-full h-24 bg-[#E5B2A0] hover:bg-[#D4A18F] disabled:bg-[#3D262A] disabled:opacity-50 text-[#2D0B18] rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-xs shadow-2xl transition-all active:scale-[0.97] flex items-center justify-center gap-6 group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 skew-x-12"></div>
                        <span className="relative z-10">Validate My Deposit</span>
                        <ArrowRightIcon className="w-5 h-5 relative z-10 group-hover:translate-x-2 transition-transform" />
                    </button>
                    <p className="text-[7px] font-bold uppercase tracking-[0.6em] text-[#E5B2A0]/30 text-center mt-8">Exquisite Banking Experience • Powered by Zen</p>
                </div>
            </div>

            <WelcomeNotification method={method} />
        </div>
    );
}

function ArrowRightIcon({ className }: { className?: string }) {
    return (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className={className}>
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
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#1A060E]/90 backdrop-blur-3xl transition-opacity duration-700 ${animateOut ? 'opacity-0' : 'opacity-100'}`}>
            <div className={`bg-[#2D0B18] rounded-[4rem] p-12 max-w-sm w-full border border-[#E5B2A0]/20 shadow-2xl relative overflow-hidden transition-all duration-700 ${animateOut ? 'scale-90 opacity-0 blur-lg' : 'scale-100 opacity-100 animate-in zoom-in-95'}`}>
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#E5B2A0]/40 to-transparent"></div>

                <div className="relative z-10 flex flex-col items-center text-center gap-10">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-[#E5B2A0]/20 rounded-full blur-2xl animate-pulse"></div>
                        <div className="w-28 h-28 rounded-full border-2 border-[#E5B2A0]/30 flex items-center justify-center p-2 relative z-10">
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-[#E5B2A0] to-[#D4A18F] flex items-center justify-center text-[#2D0B18] shadow-2xl shadow-[#D4A18F]/40">
                                <Crown size={54} strokeWidth={1} fill="currentColor" className="opacity-80" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-[10px] uppercase font-black tracking-[0.6em] text-[#E5B2A0]">Bespoke Gateway</h3>
                        <p className="text-4xl font-black italic tracking-tighter text-[#F9F4F2] leading-none">The Premium Collection</p>
                    </div>

                    <p className="text-[#E5B2A0]/60 text-[11px] font-medium leading-relaxed italic px-4">
                        "Elegance is the only beauty that never fades." <br /><br />
                        Welcome to the <span className="text-white font-bold">{method?.bankDetailType || "Premium"} Sanctuary</span>. Your journey into luxury perfume partnership starts with refined excellence.
                    </p>

                    <button
                        onClick={handleDismiss}
                        className="w-full h-18 bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] text-[#2D0B18] font-black uppercase tracking-[0.4em] text-[9px] py-6 rounded-3xl transition-all active:scale-95 shadow-2xl group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 slant-glow"></div>
                        Enter Sanctuary
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function PremiumBankDetailPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#2D0B18]"><Loader2 className="animate-spin text-[#E5B2A0]" /></div>}>
            <PremiumContent />
        </Suspense>
    );
}
