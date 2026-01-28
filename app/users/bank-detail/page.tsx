"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
    ChevronLeft,
    Building2,
    Loader2,
    ChevronRight
} from "lucide-react";

function BankDetailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const amount = searchParams.get("amount") || "0";
    const methodId = searchParams.get("methodId");

    const [loading, setLoading] = useState(true);
    const [method, setMethod] = useState<any>(null);

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
            } finally {
                setLoading(false);
            }
        };

        fetchMethod();
    }, [methodId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-slate-900 pb-32">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-xl z-50 px-6 py-5 flex items-center justify-between border-b border-slate-100">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-600 active:scale-90 transition-all font-bold"
                >
                    <ChevronLeft size={20} />
                </button>
                <h1 className="text-lg font-bold tracking-tight">Deposit</h1>
                <div className="w-10" />
            </header>

            <main className="pt-28 px-6 max-w-lg mx-auto space-y-10">
                {/* Amount Highlight */}
                <div className="text-center space-y-2 animate-in fade-in slide-in-from-top-4 duration-500">
                    <p className="text-[10px] font-bold text-slate-400 tracking-widest">Deposit amount</p>
                    <div className="flex items-center justify-center gap-3">
                        <span className="text-6xl font-black text-indigo-600 tracking-tighter">
                            {Number(amount).toLocaleString()}
                        </span>
                        <span className="text-6xl font-black text-indigo-600">Br</span>
                    </div>
                </div>

                {/* Order Summary Card */}
                <div className="bg-slate-50/50 border border-slate-100 rounded-[2.5rem] p-8 flex items-center justify-between shadow-sm animate-in zoom-in-95 duration-500">
                    <span className="text-sm font-bold text-slate-500">Amount</span>
                    <span className="text-lg font-bold text-indigo-600">Etb {Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>

                {/* Bank Selection Display */}
                <div className="space-y-6">
                    <h2 className="text-sm font-bold text-slate-900 tracking-widest leading-none px-1">Please choose payment</h2>

                    <button
                        onClick={() => {
                            if (methodId) {
                                // Default to 'regular' if no type is specified or if it's invalid
                                const theme = method?.bankDetailType || "regular";
                                const validThemes = ["regular", "express"];
                                const targetTheme = validThemes.includes(theme.toLowerCase()) ? theme.toLowerCase() : "regular";

                                router.push(`/users/bank-detail/${targetTheme}?amount=${amount}&methodId=${methodId}`);
                            }
                        }}
                        className="w-full bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between group active:scale-[0.98]">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-full border border-slate-50 overflow-hidden flex items-center justify-center bg-white shadow-sm transition-transform group-hover:scale-105 duration-500">
                                {method?.bankLogoUrl ? (
                                    <img src={method.bankLogoUrl} className="w-full h-full object-contain p-2" alt="Bank Logo" />
                                ) : (
                                    <Building2 size={24} className="text-slate-200" />
                                )}
                            </div>
                            <span className="text-sm font-black text-slate-800 text-left leading-tight">
                                {method?.bankName || "Select bank"}
                            </span>
                        </div>
                        <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                    </button>
                </div>
            </main>


        </div>
    );
}

export default function BankDetailPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>}>
            <BankDetailContent />
        </Suspense>
    );
}
