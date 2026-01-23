"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
    collection,
    onSnapshot,
    query,
    where,
    Timestamp,
    orderBy
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
    Loader2,
    TrendingUp,
    TrendingDown,
    Zap,
    Target,
    Activity,
    Calendar,
    ArrowUpCircle,
    ArrowDownCircle,
    BarChart3,
    PieChart,
    Wallet,
    Menu,
    RefreshCcw,
    ShieldCheck,
    CreditCard
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminFinancialsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [recharges, setRecharges] = useState<any[]>([]);
    const [withdrawals, setWithdrawals] = useState<any[]>([]);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            const isMaster = localStorage.getItem("admin_session") === "true";
            if (!user && !isMaster) {
                router.push("/");
                return;
            }
            setLoading(false);
        });

        // Fetch Verified Recharges
        const qRecharge = query(
            collection(db, "RechargeReview"),
            where("status", "==", "verified")
        );
        const unsubscribeRecharge = onSnapshot(qRecharge, (snapshot) => {
            setRecharges(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Fetch Withdrawals (All status for total calculation, but usually we care about the request day)
        const qWithdrawal = query(
            collection(db, "Withdrawals")
        );
        const unsubscribeWithdrawal = onSnapshot(qWithdrawal, (snapshot) => {
            setWithdrawals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubscribeAuth();
            unsubscribeRecharge();
            unsubscribeWithdrawal();
        };
    }, [router]);

    // Financial Calculations
    const stats = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        const getDailyTotal = (list: any[], dateField: string) => {
            return list.reduce((total, item) => {
                const itemDate = item[dateField]?.toDate?.() || new Date(item[dateField]);
                if (itemDate.getTime() >= startOfToday) {
                    return total + Number(item.amount || 0);
                }
                return total;
            }, 0);
        };

        const dailyRecharge = getDailyTotal(recharges, 'verifiedAt'); // Recharges only count when verified
        const dailyWithdrawal = getDailyTotal(withdrawals, 'createdAt'); // Withdrawal request amount

        const totalRecharge = recharges.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
        const totalWithdrawal = withdrawals.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

        const dailyProfit = dailyRecharge - dailyWithdrawal;
        const totalProfit = totalRecharge - totalWithdrawal;

        return {
            dailyRecharge,
            dailyWithdrawal,
            dailyProfit,
            totalRecharge,
            totalWithdrawal,
            totalProfit
        };
    }, [recharges, withdrawals]);

    const isProfit = stats.dailyProfit >= 0;

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex">
            <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between z-30">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="md:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            <Menu size={24} className="text-slate-600" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Activity size={20} className="text-indigo-600" />
                            <h1 className="text-sm font-black text-slate-900 uppercase tracking-widest">Financial Ecosystem</h1>
                        </div>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-all"
                    >
                        <RefreshCcw size={18} />
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
                    {/* Hero Header */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Vault Overview</h2>
                            <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-2">
                                <Zap size={14} className="text-amber-500" />
                                Real-time aggregate flow monitor
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className={`px-6 py-3 rounded-2xl flex items-center gap-3 border ${isProfit ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                                {isProfit ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                <span className="font-black text-xs uppercase tracking-widest">Daily {isProfit ? 'Surplus' : 'Deficit'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Daily Logic Display - Interactive Card */}
                    <div className={`rounded-[3rem] p-1 shadow-2xl transition-all duration-700 ${isProfit ? 'bg-gradient-to-br from-emerald-400 to-teal-600' : 'bg-gradient-to-br from-rose-400 to-pink-600'}`}>
                        <div className="bg-white/95 backdrop-blur-md rounded-[2.9rem] p-8 md:p-12 relative overflow-hidden">
                            {/* Decorative background icon */}
                            <div className="absolute -right-20 -bottom-20 opacity-[0.03] rotate-12">
                                {isProfit ? <TrendingUp size={400} /> : <TrendingDown size={400} />}
                            </div>

                            <div className="relative z-10 flex flex-col items-center text-center space-y-8">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Current 24h Performance</p>
                                    <div className="flex items-center justify-center gap-4">
                                        <h3 className={`text-6xl md:text-8xl font-black tracking-tighter ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {Math.abs(stats.dailyProfit).toLocaleString()}
                                        </h3>
                                        <div className="flex flex-col items-start">
                                            <span className="text-xl font-black text-slate-300">ETB</span>
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${isProfit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                {isProfit ? 'Profit' : 'Loss'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-100 w-full rounded-3xl overflow-hidden border border-slate-100">
                                    <div className="bg-white p-8 flex flex-col items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
                                            <ArrowUpCircle size={24} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-2xl font-black text-slate-900 tracking-tight">{stats.dailyRecharge.toLocaleString()}</p>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verified Recharges</p>
                                        </div>
                                    </div>
                                    <div className="bg-white p-8 flex flex-col items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-sm">
                                            <ArrowDownCircle size={24} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-2xl font-black text-slate-900 tracking-tight">{stats.dailyWithdrawal.toLocaleString()}</p>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Withdrawal Volume</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 group hover:border-indigo-100 transition-all">
                            <div className="flex items-center justify-between mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <BarChart3 size={20} />
                                </div>
                                <div className="bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest tracking-widest">Lifetime Info</span>
                                </div>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Verified Revenue</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-slate-900 tracking-tighter">{stats.totalRecharge.toLocaleString()}</span>
                                <span className="text-[10px] font-black text-slate-300">ETB</span>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 group hover:border-violet-100 transition-all">
                            <div className="flex items-center justify-between mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <PieChart size={20} />
                                </div>
                                <div className="bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pipeline</span>
                                </div>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Withdrawal Liability</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-slate-900 tracking-tighter">{stats.totalWithdrawal.toLocaleString()}</span>
                                <span className="text-[10px] font-black text-slate-300">ETB</span>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 group hover:border-emerald-100 transition-all">
                            <div className="flex items-center justify-between mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Wallet size={20} />
                                </div>
                                <div className="bg-slate-50 px-3 py-1 rounded-full border border-slate-100 text-emerald-500 font-bold text-[8px] uppercase">
                                    Equity Check
                                </div>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Running Platform Margin</p>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-3xl font-black tracking-tighter ${stats.totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {stats.totalProfit.toLocaleString()}
                                </span>
                                <span className="text-[10px] font-black text-slate-300">ETB</span>
                            </div>
                        </div>
                    </div>

                    {/* Data Sources Info */}
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                                    <ShieldCheck size={28} className="text-indigo-400" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-lg font-black tracking-tight">Enterprise Ledger Guard</h4>
                                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Auto-filtered by "verified" status on entry flow</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-3xl flex flex-col gap-1">
                                    <span className="text-[8px] font-black text-white/30 uppercase tracking-widest tracking-widest">Entry Track</span>
                                    <span className="text-xs font-black uppercase tracking-widest font-mono">Verified List</span>
                                </div>
                                <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-3xl flex flex-col gap-1">
                                    <span className="text-[8px] font-black text-white/30 uppercase tracking-widest tracking-widest">Exit Track</span>
                                    <span className="text-xs font-black uppercase tracking-widest font-mono">Gross Volume</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

