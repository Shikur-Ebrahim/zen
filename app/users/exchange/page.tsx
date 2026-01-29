"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, onSnapshot, increment } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import {
    ArrowLeftRight,
    Coins,
    Banknote,
    Loader2,
    ChevronLeft,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    RefreshCw
} from "lucide-react";

export default function ExchangePage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [exchangeRate, setExchangeRate] = useState(0);
    const [coinAmount, setCoinAmount] = useState("");
    const [etbPreview, setEtbPreview] = useState(0);
    const [exchanging, setExchanging] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [exchangedCoins, setExchangedCoins] = useState(0);
    const [exchangedETB, setExchangedETB] = useState(0);
    const [error, setError] = useState("");

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push("/");
                return;
            }
            setUser(currentUser);

            // Real-time subscription to user data
            const userRef = doc(db, "users", currentUser.uid);
            const unsubscribeUser = onSnapshot(userRef, (doc) => {
                if (doc.exists()) {
                    setUserData(doc.data());
                }
                setLoading(false);
            });

            // Fetch exchange rate from Settings
            const ratesRef = doc(db, "Settings", "currency");
            const unsubscribeRates = onSnapshot(ratesRef, (doc) => {
                if (doc.exists()) {
                    const rateData = doc.data();
                    setExchangeRate(rateData.coinRate || 0);
                }
            });

            return () => {
                unsubscribeUser();
                unsubscribeRates();
            };
        });

        return () => unsubscribe();
    }, [router]);

    // Update ETB preview when coin amount changes
    useEffect(() => {
        const amount = parseFloat(coinAmount) || 0;
        setEtbPreview(amount * exchangeRate);
        setError("");
    }, [coinAmount, exchangeRate]);

    const handleExchange = async () => {
        if (!user || !userData) return;

        const amount = parseFloat(coinAmount);

        // Validation
        if (amount < 100) {
            setError("Minimum exchange amount is 100 Coins");
            return;
        }

        if (amount > (userData.teamIncome || 0)) {
            setError("Insufficient Coin balance");
            return;
        }

        setExchanging(true);
        setError("");

        try {
            const userRef = doc(db, "users", user.uid);
            const etbAmount = amount * exchangeRate;

            // Update user document
            await updateDoc(userRef, {
                teamIncome: increment(-amount),
                balance: increment(etbAmount),
                totalIncome: increment(etbAmount)
            });

            // Store exchanged amounts for success modal
            setExchangedCoins(amount);
            setExchangedETB(etbAmount);

            // Show success animation
            setShowSuccess(true);
            setCoinAmount("");

        } catch (error) {
            console.error("Error exchanging coins:", error);
            setError("Failed to process exchange. Please try again.");
        } finally {
            setExchanging(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            {/* Header */}
            <header className="px-6 py-4 flex items-center justify-between sticky top-0 z-50 bg-slate-50/90 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm active:scale-95 transition-all"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <h1 className="text-lg font-bold text-slate-800">Exchange</h1>
                </div>
            </header>

            <main className="px-6 space-y-6 mt-2 pb-20">

                {/* Available Balance Card */}
                <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <span className="text-xs font-medium text-slate-400 block mb-1">Available Coins</span>
                        <div className="flex items-center gap-2">
                            <Coins size={20} className="text-amber-500" />
                            <span className="text-2xl font-bold text-slate-900">{Number(userData?.teamIncome || 0).toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
                        <Coins size={24} />
                    </div>
                </div>

                {/* Exchange Rate Info */}
                <div className="bg-blue-600 rounded-[1.5rem] p-6 shadow-lg shadow-blue-600/20 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <div className="relative z-10 flex justify-between items-center">
                        <div>
                            <span className="text-xs font-medium text-blue-100 block mb-1">Exchange Rate</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold">1 Coin</span>
                                <span className="text-blue-200">=</span>
                                <span className="text-2xl font-bold">{exchangeRate} ETB</span>
                            </div>
                        </div>
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                </div>

                {/* Exchange Form */}
                <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-100 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-sm font-bold text-slate-700">Amount to exchange</label>
                                <span className="text-xs text-slate-400">Min: 100</span>
                            </div>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={coinAmount}
                                    onChange={(e) => setCoinAmount(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-lg font-bold text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
                                    placeholder="0"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm">
                                    COINS
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center -my-2 relative z-10">
                            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center border-4 border-white">
                                <RefreshCw size={14} className="text-slate-400" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">You will receive</label>
                            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 flex justify-between items-center">
                                <span className="text-lg font-bold text-slate-900">{etbPreview.toLocaleString()}</span>
                                <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm">ETB</span>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleExchange}
                        disabled={exchanging || !coinAmount}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-4 font-bold text-sm shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {exchanging ? (
                            <Loader2 className="animate-spin" size={18} />
                        ) : (
                            <ArrowLeftRight size={18} />
                        )}
                        Confirm Exchange
                    </button>
                </div>
            </main>

            {/* Success Modal */}
            {showSuccess && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-6 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 text-center">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 size={32} className="text-emerald-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Exchange Successful</h3>
                        <p className="text-sm text-slate-500 mb-6">
                            You have successfully exchanged <span className="font-bold text-slate-800">{exchangedCoins} Coins</span> for <span className="font-bold text-slate-800">{exchangedETB} ETB</span>.
                        </p>
                        <button
                            onClick={() => setShowSuccess(false)}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl py-3.5 font-bold text-sm transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
