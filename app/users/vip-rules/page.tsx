"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import {
    ChevronLeft,
    Crown,
    Users,
    Wallet,
    TrendingUp,
    Calendar,
    ArrowRight,
    Star
} from "lucide-react";

export default function UserVipRulesPage() {
    const router = useRouter();
    const [vipRules, setVipRules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "VipRules"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const rules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Sort smaller to larger level number
            rules.sort((a: any, b: any) => {
                const numA = parseInt(a.level?.replace(/\D/g, '') || "0");
                const numB = parseInt(b.level?.replace(/\D/g, '') || "0");
                return numA - numB;
            });

            setVipRules(rules);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <div className="min-h-screen bg-[#0B1120] text-slate-200 font-sans selection:bg-indigo-500/30">
            {/* Background Gradients */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full mix-blend-screen"></div>
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-600/5 blur-[120px] rounded-full mix-blend-screen"></div>
            </div>

            {/* Header */}
            <header className="sticky top-0 bg-[#0B1120]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between z-50">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                >
                    <ChevronLeft size={20} />
                </button>
                <h1 className="text-lg font-bold text-white tracking-tight">VIP levels</h1>
                <div className="w-10"></div>
            </header>

            <main className="px-4 py-6 space-y-6 relative z-10 pb-24">
                {/* Simplified Hero */}
                <div className="text-center space-y-2 py-4">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                        Grow your income
                    </h2>
                    <p className="text-slate-400 text-xs max-w-xs mx-auto leading-relaxed">
                        Climb the ranks to unlock exclusive monthly salaries and bonuses.
                    </p>
                </div>

                {/* Rules List */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                        </div>
                    ) : vipRules.length > 0 ? (
                        vipRules.map((rule, idx) => (
                            <div
                                key={rule.id}
                                className="group relative bg-slate-900/40 backdrop-blur-md rounded-3xl p-1 border border-white/5 hover:border-indigo-500/20 transition-all duration-300"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                <div className="relative p-4 space-y-4">
                                    {/* Split Layout: Image Left | Stats Right */}
                                    <div className="flex gap-3 items-center">
                                        {/* Large Image - No Box/Padding */}
                                        <div className="w-[110px] shrink-0 flex items-center justify-center">
                                            <img
                                                src={rule.imageUrl}
                                                alt="tier"
                                                className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(79,70,229,0.3)] filter contrast-125"
                                            />
                                        </div>

                                        {/* Stacked Stats Column */}
                                        <div className="flex-1 flex flex-col gap-2.5">
                                            {/* Team Size */}
                                            <div className="bg-white/[0.03] rounded-xl p-2.5 border border-white/5">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <div className="w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                                        <Users size={10} className="text-indigo-400" />
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Team size</span>
                                                </div>
                                                <p className="text-base font-bold text-white pl-1">
                                                    {rule.investedTeamSize}
                                                </p>
                                            </div>

                                            {/* Team Balance */}
                                            <div className="bg-white/[0.03] rounded-xl p-2.5 border border-white/5">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                                        <Wallet size={10} className="text-emerald-400" />
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Team balance</span>
                                                </div>
                                                <p className="text-base font-bold text-white pl-1 leading-tight">
                                                    {Number(rule.totalTeamAssets).toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">ETB</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Rewards Section */}
                                    <div className="space-y-2.5 pt-2 border-t border-white/5 px-1">
                                        <div className="flex items-center justify-between group/item">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                                    <TrendingUp size={12} className="text-indigo-400" />
                                                </div>
                                                <span className="text-xs text-slate-300">Monthly pay</span>
                                            </div>
                                            <span className="text-sm font-bold text-indigo-300">
                                                {Number(rule.monthlySalary).toLocaleString()} ETB
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between group/item">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center">
                                                    <Star size={12} className="text-amber-400" />
                                                </div>
                                                <span className="text-xs text-slate-300">Loyalty bonus</span>
                                            </div>
                                            <span className="text-sm font-bold text-amber-300/90">
                                                {Number(rule.yearlySalary5Year).toLocaleString()} ETB
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 text-slate-500">
                            <p>No tiers available</p>
                        </div>
                    )}
                </div>

                {/* Regional Manager Section */}
                <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-3xl p-6 text-center space-y-3 relative overflow-hidden">
                    <div className="absolute inset-0 bg-amber-500/5 blur-xl"></div>
                    <div className="relative z-10">
                        <p className="text-sm font-medium text-amber-100/90 leading-relaxed">
                            After reaching <span className="text-amber-400 font-bold">V7</span>, you can also apply for the position of <span className="text-white font-bold">regional manager</span>, become the top management of <span className="text-white font-bold">DPM Fragrances</span>, and receive an annual dividend of no less than
                        </p>
                        <p className="text-xl font-bold text-amber-400 mt-2 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
                            9,000,000 ETB
                        </p>
                    </div>
                </div>

                {/* Footer Note */}
                <p className="text-xs text-slate-500 text-center leading-relaxed px-8">
                    * Rewards are distributed automatically. Standard platform terms apply.
                </p>
            </main>
        </div>
    );
}
