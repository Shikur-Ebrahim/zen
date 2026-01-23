"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import {
    ChevronLeft,
    AlertCircle,
    CheckCircle2,
    CreditCard,
    Info,
    ArrowRight,
    Loader2
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";

// Default fallback in case Firestore fetch fails
const DEFAULT_PRESETS = [
    4500, 12550, 35500, 65550, 135550,
    250500, 450500, 600550, 850500, 1500000, 3550050
];

function RechargeContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [amount, setAmount] = useState<string>("0");
    const [customAmount, setCustomAmount] = useState<string>("");
    const [minRecharge, setMinRecharge] = useState<number>(4500);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [presetAmounts, setPresetAmounts] = useState<number[]>(DEFAULT_PRESETS);
    const [fetchingPresets, setFetchingPresets] = useState(true);
    useEffect(() => {
        const fetchProductPrices = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "Products"));
                const prices: number[] = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.price) prices.push(Number(data.price));
                });

                // Filter unique values and sort ascending
                const uniquePrices = Array.from(new Set(prices)).sort((a, b) => a - b);

                if (uniquePrices.length > 0) {
                    setPresetAmounts(uniquePrices);
                }
            } catch (error) {
                console.error("Error fetching product prices:", error);
            } finally {
                setFetchingPresets(false);
            }
        };

        const fetchSettings = async () => {
            try {
                const docRef = doc(db, "GlobalSettings", "recharge");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const settings = docSnap.data();
                    if (settings.minAmount) {
                        const min = Number(settings.minAmount);
                        setMinRecharge(min);
                        // If no amount in searchParams, use min
                        if (!searchParams.get("amount")) {
                            setAmount(min.toString());
                        } else {
                            setAmount(searchParams.get("amount")!);
                        }
                    }
                } else {
                    // Fallback to initial amount if no doc
                    setAmount(searchParams.get("amount") || "4500");
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
                setAmount(searchParams.get("amount") || "4500");
            }
        };

        fetchProductPrices();
        fetchSettings();
    }, [searchParams]);

    const handleAmountSelect = (val: number) => {
        setAmount(val.toString());
        setCustomAmount("");
    };

    const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (/^\d*$/.test(val)) {
            setCustomAmount(val);
            if (val) setAmount(val);
        }
    };

    const handleNext = () => {
        const numAmount = parseInt(amount);
        if (isNaN(numAmount) || numAmount < minRecharge) {
            setErrorMsg(`Minimum recharge amount is ${minRecharge.toLocaleString()} ETB`);
            setShowErrorModal(true);
            return;
        }
        router.push(`/users/payment-method?amount=${amount}`);
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white pb-40 relative selection:bg-[#D4AF37]/30">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#D4AF37]/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#9A7B4F]/10 blur-[100px] rounded-full" />
            </div>

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 bg-[#0A0A0A]/60 backdrop-blur-2xl z-50 px-6 py-6 flex items-center justify-between border-b border-[#D4AF37]/10">
                <button
                    onClick={() => router.back()}
                    className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#1A1A1A] border border-[#D4AF37]/20 text-[#D4AF37] active:scale-90 transition-all shadow-lg shadow-black/50"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-xl font-black tracking-[0.2em] uppercase bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] bg-clip-text text-transparent">
                    Recharge
                </h1>
                <div className="w-12" /> {/* Spacer */}
            </header>

            <main className="pt-32 px-6 space-y-10 max-w-lg mx-auto relative z-10">
                {/* Amount Display Card */}
                <section className="relative group animate-in fade-in slide-in-from-top-6 duration-700">
                    <div className="bg-gradient-to-br from-[#BF953F] via-[#FCF6BA] to-[#B38728] rounded-[2.5rem] p-1 shadow-[0_20px_50px_rgba(212,175,55,0.3)]">
                        <div className="bg-[#0A0A0A] rounded-[2.3rem] p-10 relative overflow-hidden h-full flex flex-col justify-center">
                            {/* Metallic Shine Effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none"></div>

                            <p className="text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.3em] mb-4 opacity-70">Recharge Amount</p>
                            <div className="flex items-baseline gap-3">
                                <span className="text-white text-6xl font-black tracking-tighter tabular-nums drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                                    {Number(amount).toLocaleString()}
                                </span>
                                <span className="bg-gradient-to-b from-[#FCF6BA] to-[#B38728] bg-clip-text text-transparent font-black uppercase tracking-widest text-base">ETB</span>
                            </div>

                            <div className="mt-8 flex gap-1">
                                {[...Array(8)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1 flex-1 rounded-full transition-all duration-500 ${i < 5 ? "bg-gradient-to-r from-[#BF953F] to-[#FCF6BA]" : "bg-white/5"
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Preset Grid */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-[10px] font-black text-[#D4AF37]/60 uppercase tracking-[0.2em]">Select Amount</h2>
                        {fetchingPresets && <Loader2 size={14} className="animate-spin text-[#D4AF37]/40" />}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {presetAmounts.map((val) => {
                            const isSelected = amount === val.toString() && !customAmount;
                            return (
                                <button
                                    key={val}
                                    onClick={() => handleAmountSelect(val)}
                                    className={`relative py-6 rounded-[2rem] font-black text-sm transition-all active:scale-95 group overflow-hidden ${isSelected
                                            ? "bg-gradient-to-br from-[#BF953F] via-[#FCF6BA] to-[#B38728] text-black shadow-xl shadow-[#D4AF37]/20"
                                            : "bg-[#1A1A1A] text-[#D4AF37]/60 border border-[#D4AF37]/10 hover:border-[#D4AF37]/30 shadow-none"
                                        }`}
                                >
                                    {val.toLocaleString()}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Custom Amount */}
                <section className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
                    <div className="flex items-center gap-2 px-1">
                        <div className="w-1.5 h-3 bg-gradient-to-b from-[#FCF6BA] to-[#B38728] rounded-full"></div>
                        <h2 className="text-[10px] font-black text-[#D4AF37]/60 uppercase tracking-[0.2em]">Custom (Min. {minRecharge.toLocaleString()})</h2>
                    </div>

                    <div className="relative group">
                        <div className="absolute left-7 top-1/2 -translate-y-1/2 text-[#D4AF37]/40 group-focus-within:text-[#D4AF37] transition-all duration-300">
                            <CreditCard size={22} />
                        </div>
                        <input
                            type="text"
                            placeholder="Enter custom amount..."
                            value={customAmount}
                            onChange={handleCustomAmountChange}
                            className="w-full bg-[#1A1A1A] border border-[#D4AF37]/10 rounded-[2rem] py-7 pl-16 pr-8 text-xl font-black text-white placeholder:text-white/10 focus:outline-none focus:ring-4 focus:ring-[#D4AF37]/5 focus:border-[#D4AF37]/40 transition-all shadow-inner"
                        />
                    </div>
                </section>

                {/* Tips Section */}
                <section className="bg-[#1A1A1A] rounded-[2.5rem] p-8 border border-[#D4AF37]/10 space-y-8 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[#D4AF37]/10 transition-all duration-500"></div>

                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center text-[#D4AF37]">
                            <Info size={22} />
                        </div>
                        <h3 className="text-xs font-black text-[#D4AF37] uppercase tracking-[0.2em]">Important Security</h3>
                    </div>

                    <ul className="space-y-5">
                        {[
                            "Always verify recharge account info only from our official app interface.",
                            "Account details rotate. Please refresh and copy the latest details for every recharge.",
                            "Verification requires a valid 12-digit transaction ID provided after payment."
                        ].map((tip, i) => (
                            <li key={i} className="flex gap-4 items-start group/tip">
                                <div className="w-6 h-6 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0 mt-0.5 group-hover/tip:bg-[#D4AF37]/20 transition-all">
                                    <span className="text-[10px] font-black text-[#D4AF37]">{i + 1}</span>
                                </div>
                                <p className="text-[11px] font-medium text-white/50 leading-relaxed group-hover/tip:text-white/80 transition-all">{tip}</p>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Action Button */}
                <div className="pt-6">
                    <button
                        onClick={handleNext}
                        className="w-full bg-gradient-to-br from-[#BF953F] via-[#FCF6BA] to-[#B38728] text-[#0A0A0A] py-7 rounded-[2rem] font-black uppercase tracking-[0.3em] text-[11px] shadow-[0_15px_40px_rgba(212,175,55,0.25)] hover:shadow-[0_20px_50px_rgba(212,175,55,0.4)] hover:-translate-y-1 active:scale-[0.97] transition-all duration-300 flex items-center justify-center gap-4 group"
                    >
                        <span>Select Payment Method</span>
                        <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform duration-300" />
                    </button>
                </div>
            </main>

            {/* Premium Error Modal */}
            {showErrorModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
                    <div className="bg-[#1A1A1A] w-full max-w-sm rounded-[3rem] p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-red-500/20 relative overflow-hidden animate-in zoom-in-95 duration-500">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>

                        <div className="flex flex-col items-center text-center gap-8 relative z-10">
                            <div className="w-24 h-24 bg-red-500/10 rounded-[2rem] flex items-center justify-center text-red-500 animate-pulse">
                                <AlertCircle size={48} strokeWidth={1.5} />
                            </div>

                            <div className="space-y-3">
                                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Security Alert</h2>
                                <p className="text-white/40 text-sm font-medium leading-relaxed px-2">
                                    {errorMsg}
                                </p>
                            </div>

                            <button
                                onClick={() => setShowErrorModal(false)}
                                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 py-5 rounded-[1.5rem] border border-red-500/20 font-black uppercase tracking-widest text-xs transition-all shadow-lg active:scale-95"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function RechargePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
            </div>
        }>
            <RechargeContent />
        </Suspense>
    );
}
