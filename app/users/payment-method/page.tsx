"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import {
    ChevronLeft,
    CheckCircle2,
    Building2,
    Loader2,
    ArrowRight,
    Wallet,
    ShieldCheck,
    CreditCard
} from "lucide-react";

function PaymentMethodContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const amount = searchParams.get("amount") || "0";

    const [loading, setLoading] = useState(true);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

    useEffect(() => {
        const q = query(
            collection(db, "paymentMethods"),
            where("status", "==", "active")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPaymentMethods(data);
            if (data.length > 0 && !selectedMethod) {
                setSelectedMethod(data[0].id);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [selectedMethod]);

    const handleRecharge = () => {
        if (!selectedMethod) {
            alert("Please select a payment method");
            return;
        }

        const method = paymentMethods.find(m => m.id === selectedMethod);
        const theme = method?.bankDetailType || "regular";
        const validThemes = ["regular", "premium", "digital", "express", "smart", "secure"];
        const targetTheme = validThemes.includes(theme.toLowerCase()) ? theme.toLowerCase() : "regular";

        router.push(`/users/bank-detail/${targetTheme}?amount=${amount}&methodId=${selectedMethod}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-[#D4AF37]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white pb-44 relative selection:bg-[#D4AF37]/30 overflow-x-hidden">
            {/* Background Decorative Elements - Advanced Glows */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-15%] right-[-15%] w-[60%] h-[60%] bg-[#D4AF37]/10 blur-[140px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-15%] left-[-15%] w-[50%] h-[50%] bg-[#9A7B4F]/10 blur-[120px] rounded-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.03),transparent_70%)]" />
            </div>

            {/* Header - Advanced Mobile Style */}
            <header className="fixed top-0 left-0 right-0 bg-[#0A0A0A]/80 backdrop-blur-3xl z-50 px-6 py-8 flex flex-col gap-6 border-b border-[#D4AF37]/10">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#1A1A1A] border border-[#D4AF37]/20 text-[#D4AF37] active:scale-90 transition-all shadow-lg"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div className="flex flex-col items-center">
                        <h1 className="text-xl font-bold tracking-[0.25em] bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] bg-clip-text text-transparent">
                            Selection
                        </h1>
                        <div className="h-0.5 w-8 bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent mt-1"></div>
                    </div>
                    <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#D4AF37]/10 text-[#D4AF37]">
                        <ShieldCheck size={20} />
                    </div>
                </div>
            </header>

            <main className="pt-40 px-6 max-w-lg mx-auto space-y-14 relative z-10">
                {/* Amount Display Card - Premium Elevation */}
                <section className="animate-in fade-in slide-in-from-top-8 duration-1000">
                    <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] rounded-[3rem] p-10 border border-[#D4AF37]/20 shadow-2xl relative overflow-hidden text-center">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 rounded-full blur-3xl -mr-16 -mt-16"></div>

                        <p className="text-[10px] font-bold text-[#D4AF37]/60 tracking-[0.4em] mb-4">Confirm recharge amount</p>
                        <div className="flex items-center justify-center gap-4">
                            <span className="text-6xl font-black text-white tracking-tighter tabular-nums drop-shadow-[0_4px_20px_rgba(212,175,55,0.15)]">
                                {Number(amount).toLocaleString()}
                            </span>
                            <div className="flex flex-col items-start">
                                <span className="bg-gradient-to-b from-[#FCF6BA] to-[#B38728] bg-clip-text text-transparent font-black uppercase tracking-widest text-lg">Br</span>
                                <div className="h-0.5 w-full bg-[#D4AF37]/30 rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Grid Selection System */}
                <section className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-4 bg-gradient-to-b from-[#FCF6BA] to-[#B38728] rounded-full"></div>
                            <h2 className="text-[10px] font-bold text-[#D4AF37]/60 tracking-[0.3em]">Gateways</h2>
                        </div>
                        <div className="px-3 py-1 bg-[#D4AF37]/10 rounded-full border border-[#D4AF37]/20">
                            <p className="text-[8px] font-black text-[#D4AF37] uppercase tracking-wider">{paymentMethods.length} Available</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        {paymentMethods.map((method) => {
                            const isSelected = selectedMethod === method.id;
                            return (
                                <button
                                    key={method.id}
                                    onClick={() => setSelectedMethod(method.id)}
                                    className={`relative group p-1 rounded-[2.5rem] transition-all duration-500 ${isSelected
                                        ? "bg-gradient-to-br from-[#BF953F] via-[#FCF6BA] to-[#B38728] shadow-[0_20px_40px_rgba(212,175,55,0.2)] scale-[1.05]"
                                        : "bg-[#1A1A1A] border border-[#D4AF37]/10 hover:border-[#D4AF37]/40 shadow-xl"
                                        }`}
                                >
                                    <div className={`h-full rounded-[2.3rem] p-6 flex flex-col items-center justify-center gap-5 transition-all duration-500 overflow-hidden relative ${isSelected ? "bg-[#0A0A0A]" : "bg-[#1A1A1A]"
                                        }`}>
                                        {/* Selection Glow */}
                                        {isSelected && (
                                            <div className="absolute top-0 right-0 w-16 h-16 bg-[#D4AF37]/10 rounded-full blur-2xl animate-pulse"></div>
                                        )}

                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden transition-all p-2 ${isSelected
                                            ? "bg-white shadow-[0_0_20px_rgba(212,175,55,0.3)] scale-110"
                                            : "bg-black/40 border border-[#D4AF37]/10"
                                            }`}>
                                            {method.logoUrl ? (
                                                <img src={method.logoUrl} className="w-full h-full object-contain" alt={method.methodName} />
                                            ) : (
                                                <Wallet className="text-[#D4AF37]/40" size={32} />
                                            )}
                                        </div>

                                        <div className="text-center space-y-1">
                                            <span className={`text-sm font-bold transition-colors block tracking-[0.1em] ${isSelected ? "text-white" : "text-white/40"
                                                }`}>
                                                {method.methodName}
                                            </span>
                                            {isSelected && (
                                                <div className="flex justify-center">
                                                    <div className="w-4 h-4 rounded-full bg-[#D4AF37] flex items-center justify-center text-black">
                                                        <CheckCircle2 size={12} strokeWidth={3} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {paymentMethods.length === 0 && (
                        <div className="py-24 text-center space-y-6 bg-[#1A1A1A] rounded-[3rem] border-2 border-dashed border-[#D4AF37]/10">
                            <Building2 size={40} className="mx-auto text-[#D4AF37]/20" />
                            <p className="text-white/20 font-bold tracking-[0.4em] text-[10px]">Gateways offline</p>
                        </div>
                    )}
                </section>
            </main>

            {/* Bottom Action Section - Highly Styled */}
            <div className="fixed bottom-0 left-0 right-0 p-8 pt-12 relative z-[60]">
                {/* Advanced Gradient Shadow Mask */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/95 to-transparent -top-20 pointer-events-none"></div>

                <div className="max-w-lg mx-auto relative group">
                    <button
                        onClick={handleRecharge}
                        disabled={!selectedMethod}
                        className="w-full bg-gradient-to-br from-[#BF953F] via-[#FCF6BA] to-[#B38728] text-black h-20 rounded-[2.2rem] font-black uppercase tracking-[0.35em] text-[11px] shadow-[0_20px_60px_-10px_rgba(212,175,55,0.4)] hover:shadow-[0_25px_80px_rgba(212,175,55,0.5)] active:scale-95 transition-all duration-500 overflow-hidden flex items-center justify-center gap-5 disabled:opacity-30 disabled:grayscale"
                    >
                        <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"></div>
                        <span className="relative z-10">Proceed to merchant</span>
                        <ArrowRight size={20} className="relative z-10 group-hover:translate-x-2 transition-transform duration-300" />
                    </button>

                    <div className="mt-8 flex items-center justify-center gap-6 opacity-30 select-none">
                        <CreditCard size={14} />
                        <span className="text-[8px] font-black uppercase tracking-[0.5em]">End-to-End Encryption</span>
                        <ShieldCheck size={14} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function UserPaymentMethodPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]"><Loader2 className="w-10 h-10 animate-spin text-[#D4AF37]" /></div>}>
            <PaymentMethodContent />
        </Suspense>
    );
}
