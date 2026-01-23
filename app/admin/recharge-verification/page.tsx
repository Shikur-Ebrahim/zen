"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
    collection,
    onSnapshot,
    query,
    where,
    doc,
    updateDoc,
    deleteDoc,
    increment,
    runTransaction,
    Timestamp,
    getDoc,
    getDocs
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    Loader2,
    RefreshCcw,
    ArrowLeft,
    ShieldCheck,
    Menu
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import { toast } from "sonner";

export default function RechargeVerificationPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [verifying, setVerifying] = useState<string | null>(null);
    const [recharges, setRecharges] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [vipRules, setVipRules] = useState<any[]>([]);
    const [confirmAction, setConfirmAction] = useState<{ type: 'verify' | 'reject', data: any } | null>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            const isMaster = localStorage.getItem("admin_session") === "true";
            if (!user && !isMaster) {
                router.push("/");
                return;
            }
            setLoading(false);
        });

        const q = query(
            collection(db, "RechargeReview"),
            where("status", "in", ["Under Review", "verified"])
        );

        // Fetch VIP Rules once
        const fetchVipRules = async () => {
            const snap = await getDocs(collection(db, "VipRules"));
            setVipRules(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };
        fetchVipRules();

        const unsubscribeRecharges = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const sortedData = data.sort((a: any, b: any) => {
                // Primary Sort: Status "Under Review" comes first
                if (a.status === 'Under Review' && b.status !== 'Under Review') return -1;
                if (a.status !== 'Under Review' && b.status === 'Under Review') return 1;

                // Secondary Sort: Newest timestamp first
                const timeA = a.timestamp?.toMillis?.() || 0;
                const timeB = b.timestamp?.toMillis?.() || 0;
                return timeB - timeA;
            });
            setRecharges(sortedData);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeRecharges();
        };
    }, [router]);

    const handleVerify = async (recharge: any) => {
        if (verifying) return;
        setVerifying(recharge.id);
        setConfirmAction(null);

        try {
            await runTransaction(db, async (transaction) => {
                let userDocRef = doc(db, "users", recharge.userId);
                let userDocSnap = await transaction.get(userDocRef);

                // Fallback: If UID lookup fails, try phone number
                if (!userDocSnap.exists()) {
                    console.log("UID lookup failed, trying phone number fallback...");
                    const q = query(collection(db, "users"), where("phoneNumber", "==", recharge.phoneNumber));
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        userDocRef = doc(db, "users", snap.docs[0].id);
                        userDocSnap = await transaction.get(userDocRef);
                    }
                }

                if (!userDocSnap.exists()) {
                    throw new Error("User does not exist!");
                }

                const userData = userDocSnap.data();
                const amount = Number(recharge.amount);

                // 2. Fetch Referral Settings (Dynamic)
                const settingsSnap = await transaction.get(doc(db, "settings", "referral"));
                const defaults = { levelA: 12, levelB: 7, levelC: 4, levelD: 2 };
                const dbRates = settingsSnap.exists() ? settingsSnap.data() : {};
                const rates = { ...defaults, ...dbRates };

                const pctA = Number(rates.levelA) / 100;
                const pctB = Number(rates.levelB) / 100;
                const pctC = Number(rates.levelC) / 100;
                const pctD = Number(rates.levelD) / 100;

                const inviterUids = [
                    { uid: userData.inviterA, pct: pctA },
                    { uid: userData.inviterB, pct: pctB },
                    { uid: userData.inviterC, pct: pctC },
                    { uid: userData.inviterD, pct: pctD }
                ].filter(i => i.uid);

                const inviterRefs = inviterUids.map(i => ({
                    ref: doc(db, "users", i.uid),
                    pct: i.pct
                }));

                const inviterSnaps = await Promise.all(inviterRefs.map(i => transaction.get(i.ref)));
                const isFirstRecharge = (userData.totalRecharge || 0) === 0;

                // 3. Update User
                transaction.update(userDocRef, {
                    totalRecharge: increment(amount),
                    Recharge: increment(amount)
                });

                // Update Recharge Status
                const rechargeRef = doc(db, "RechargeReview", recharge.id);
                transaction.update(rechargeRef, {
                    status: "verified",
                    verifiedAt: Timestamp.now()
                });

                // Update Inviters
                inviterSnaps.forEach((snap, index) => {
                    if (snap.exists()) {
                        const { ref, pct } = inviterRefs[index];
                        const inviterData = snap.data();
                        const inviterUpdate: any = {
                            teamAssets: increment(amount)
                        };

                        if (isFirstRecharge) {
                            const bonus = amount * pct;
                            inviterUpdate.teamIncome = increment(bonus);
                            inviterUpdate.investedTeamSize = increment(1);

                            // VIP Eligibility Check
                            const currentInvestedSize = (inviterData.investedTeamSize || 0) + 1;
                            const currentTeamAssets = (inviterData.teamAssets || 0) + amount;
                            const currentVip = inviterData.vip ?? 0;
                            const currentVipNum = typeof currentVip === 'number' ? currentVip : parseInt(currentVip.toString().replace(/\D/g, '') || "0");
                            const nextVipNum = currentVipNum + 1;

                            const nextRule = vipRules.find(r => parseInt(r.level?.replace(/\D/g, '') || "0") === nextVipNum);
                            if (nextRule && currentInvestedSize >= (Number(nextRule.investedTeamSize) || 0) && currentTeamAssets >= (Number(nextRule.totalTeamAssets) || 0)) {
                                inviterUpdate.isVipEligible = true;
                            }

                            // Notification
                            const levelLabels = ["Level A", "Level B", "Level C", "Level D"];
                            const notifRef = doc(collection(db, "UserNotifications"));
                            transaction.set(notifRef, {
                                userId: snap.id,
                                type: "reward",
                                amount: bonus.toFixed(2),
                                level: levelLabels[index],
                                message: `Reward received: ${bonus.toFixed(2)} ETB from ${levelLabels[index]}.`,
                                fromUser: userData.phoneNumber || "A team member",
                                createdAt: Timestamp.now(),
                                read: false
                            });
                        } else {
                            const currentInvestedSize = inviterData.investedTeamSize || 0;
                            const currentTeamAssets = (inviterData.teamAssets || 0) + amount;
                            const currentVip = inviterData.vip ?? 0;
                            const currentVipNum = typeof currentVip === 'number' ? currentVip : parseInt(currentVip.toString().replace(/\D/g, '') || "0");
                            const nextVipNum = currentVipNum + 1;

                            const nextRule = vipRules.find(r => parseInt(r.level?.replace(/\D/g, '') || "0") === nextVipNum);
                            if (nextRule && currentInvestedSize >= (Number(nextRule.investedTeamSize) || 0) && currentTeamAssets >= (Number(nextRule.totalTeamAssets) || 0)) {
                                inviterUpdate.isVipEligible = true;
                            }
                        }
                        transaction.update(ref, inviterUpdate);
                    }
                });
            });

            toast.success(`Verified ETB ${recharge.amount} & Distributed Rewards`);
        } catch (error: any) {
            console.error("Verification error:", error);
            toast.error(error.message === "User does not exist!" ? "User not found in database" : "Failed to verify transaction");
        } finally {
            setVerifying(null);
        }
    };

    const handleReject = async (id: string) => {
        setVerifying(id);
        setConfirmAction(null);
        try {
            await deleteDoc(doc(db, "RechargeReview", id));
            toast.info("Record permanently deleted");
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Error deleting record");
        } finally {
            setVerifying(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                <span className="text-slate-500 font-bold text-sm tracking-tight">Initializing...</span>
            </div>
        );
    }

    const filteredRecharges = recharges.filter(r =>
        r.phoneNumber?.includes(searchTerm) ||
        r.FTcode?.includes(searchTerm)
    );

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 overflow-x-hidden relative flex">
            {/* Confirmation Modal */}
            {confirmAction && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-6 transition-all">
                    <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl space-y-8 border border-white/40">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center ${confirmAction.type === 'verify' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'} shadow-sm`}>
                                {confirmAction.type === 'verify' ? <CheckCircle2 size={40} /> : <XCircle size={40} />}
                            </div>
                            <h3 className="text-xl font-black text-slate-900 leading-tight">
                                {confirmAction.type === 'verify' ? 'Confirm Verification' : 'Permanently Delete?'}
                            </h3>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                {confirmAction.type === 'verify'
                                    ? `Authorize deposit of ETB ${Number(confirmAction.data.amount).toLocaleString()}?`
                                    : "This action will permanently remove the record from the database."
                                }
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setConfirmAction(null)}
                                className="h-14 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm tracking-tight hover:bg-slate-200 transition-all border border-slate-200/50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => confirmAction.type === 'verify' ? handleVerify(confirmAction.data) : handleReject(confirmAction.data.id)}
                                disabled={verifying === confirmAction.data.id}
                                className={`h-14 rounded-2xl text-white font-bold text-sm transition-all shadow-lg ${confirmAction.type === 'verify' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' : 'bg-red-600 hover:bg-red-700 shadow-red-500/20'} disabled:opacity-50`}
                            >
                                {verifying === confirmAction.data.id ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <div className="flex-1 flex flex-col min-h-screen max-w-full overflow-hidden">
                <header className="sticky top-0 bg-white/80 backdrop-blur-xl px-4 lg:px-10 py-5 flex items-center justify-between z-50 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="md:hidden w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-90"
                        >
                            <Menu size={20} />
                        </button>
                        <div className="flex flex-col">
                            <h2 className="text-lg lg:text-xl font-black text-slate-900 tracking-tight leading-none">Transactions</h2>
                            <p className="text-[10px] font-bold text-slate-400 mt-1">Verification Queue</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="hidden sm:flex px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl items-center gap-2">
                            <Clock size={16} className="text-blue-600" />
                            <span className="text-[11px] font-black text-blue-600">Pending: {recharges.filter(r => r.status === 'Under Review').length}</span>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all active:rotate-180 duration-500"
                        >
                            <RefreshCcw size={18} />
                        </button>
                    </div>
                </header>

                <div className="p-4 lg:p-10 space-y-6 max-w-4xl mx-auto w-full">
                    {/* Financial Summary Dashboard */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-emerald-100/50 to-white/50 backdrop-blur-3xl border border-emerald-100/50 p-6 rounded-[2.5rem] shadow-[0_15px_30px_-10px_rgba(16,185,129,0.1)] flex flex-col gap-1 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-[0.05] group-hover:scale-125 group-hover:rotate-12 transition-all duration-700">
                                <CheckCircle2 size={60} className="text-emerald-500" />
                            </div>
                            <p className="text-[10px] font-black text-emerald-600 mb-2 drop-shadow-sm">Total Revenue</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-slate-900 tracking-tighter">
                                    {recharges.filter(r => r.status === 'verified').reduce((acc, curr) => acc + Number(curr.amount), 0).toLocaleString()}
                                </span>
                                <span className="text-[10px] font-black text-slate-400">ETB</span>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-blue-100/50 to-white/50 backdrop-blur-3xl border border-blue-100/50 p-6 rounded-[2.5rem] shadow-[0_15px_30px_-10px_rgba(37,99,235,0.1)] flex flex-col gap-1 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-[0.05] group-hover:scale-125 group-hover:-rotate-12 transition-all duration-700">
                                <Clock size={60} className="text-blue-500" />
                            </div>
                            <p className="text-[10px] font-black text-blue-600 mb-2 drop-shadow-sm">Live Pipeline</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-slate-900 tracking-tighter">
                                    {recharges.filter(r => r.status === 'Under Review').reduce((acc, curr) => acc + Number(curr.amount), 0).toLocaleString()}
                                </span>
                                <span className="text-[10px] font-black text-slate-400">ETB</span>
                            </div>
                        </div>
                    </div>

                    {/* Elite Search Component */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                            <Search size={20} className="text-slate-400 group-focus-within:text-blue-600 transition-colors duration-300" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search (phone or FT)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-16 pl-14 pr-6 bg-white/50 backdrop-blur-3xl border border-slate-200/60 rounded-[2rem] focus:outline-none focus:border-blue-500/50 focus:ring-8 focus:ring-blue-500/5 transition-all duration-300 text-sm font-bold shadow-xl shadow-slate-200/50 placeholder:text-slate-400 placeholder:font-black"
                        />
                    </div>

                    <div className="space-y-4">
                        {filteredRecharges.length > 0 ? (
                            filteredRecharges.map((recharge) => (
                                <div
                                    key={recharge.id}
                                    className={`relative group rounded-[3rem] p-0.5 transition-all duration-700 hover:scale-[1.01] active:scale-[0.99]
                                        ${recharge.status === 'verified'
                                            ? 'bg-gradient-to-br from-emerald-100/50 via-emerald-50/20 to-emerald-100/50 shadow-[0_20px_50px_-12px_rgba(16,185,129,0.1)]'
                                            : 'bg-gradient-to-br from-blue-100/50 via-slate-50/20 to-blue-100/50 shadow-[0_20px_50px_-12px_rgba(37,99,235,0.1)]'}
                                    `}
                                >
                                    <div className="bg-white/80 backdrop-blur-3xl rounded-[2.9rem] p-8 lg:p-10 relative overflow-hidden h-full border border-white/40">
                                        {/* Dynamic Animated Mesh */}
                                        <div className={`absolute top-0 right-0 w-[500px] h-[500px] -mr-64 -mt-64 rounded-full blur-[120px] opacity-[0.08] pointer-events-none transition-all duration-1000 group-hover:opacity-[0.15] group-hover:scale-110
                                            ${recharge.status === 'verified' ? 'bg-emerald-400' : 'bg-blue-400'}`}></div>
                                        <div className={`absolute bottom-0 left-0 w-[300px] h-[300px] -ml-32 -mb-32 rounded-full blur-[80px] opacity-[0.05] pointer-events-none transition-all duration-1000 group-hover:opacity-[0.1]
                                            ${recharge.status === 'verified' ? 'bg-emerald-300' : 'bg-blue-300'}`}></div>

                                        <div className="flex flex-col gap-8 relative z-10">
                                            {/* Status & Date */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                                <div className={`w-fit px-5 py-2 rounded-2xl text-[10px] font-black tracking-widest flex items-center gap-2.5 transition-all duration-500 border
                                                ${recharge.status === 'verified'
                                                        ? 'bg-emerald-50/50 text-emerald-600 border-emerald-100/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                                                        : 'bg-blue-50/50 text-blue-600 border-blue-100/50 shadow-[0_0_20px_rgba(37,99,235,0.1)]'} `}>
                                                    <div className={`w-2 h-2 rounded-full shadow-current shadow-sm ${recharge.status === 'verified' ? 'bg-emerald-500' : 'bg-blue-500 animate-[pulse_2s_infinite]'} `}></div>
                                                    {recharge.status === 'verified' ? 'System Verified' : 'Live Review Queue'}
                                                </div>
                                                <div className="flex items-center gap-1.5 p-1 px-4 bg-slate-50/50 border border-slate-100/50 rounded-2xl backdrop-blur-md">
                                                    <span className="text-[10px] font-black text-slate-300 tracking-widest">Entry</span>
                                                    <span className="text-[10px] font-bold text-slate-500">
                                                        {recharge.timestamp?.toDate()?.toLocaleDateString()} • {recharge.timestamp?.toDate()?.toLocaleTimeString()}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                                                <div className="space-y-3">
                                                    <p className="text-[10px] font-black text-slate-400 leading-none">Terminal ID</p>
                                                    <p className="text-xl font-black text-slate-900 tracking-tighter leading-none">{recharge.phoneNumber}</p>
                                                </div>
                                                <div className="space-y-3">
                                                    <p className="text-[10px] font-black text-slate-400 leading-none">Credit Amount</p>
                                                    <div className="flex items-baseline gap-2 leading-none">
                                                        <span className={`text-3xl font-black tracking-tighter transition-all duration-500 ${recharge.status === 'verified' ? 'text-emerald-600' : 'text-blue-600'}`}>{Number(recharge.amount).toLocaleString()}</span>
                                                        <span className="text-[10px] font-black text-slate-300">ETB</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <p className="text-[10px] font-black text-slate-400 leading-none">FT</p>
                                                    <div className="bg-slate-50/80 backdrop-blur-md border border-slate-100 p-4 rounded-3xl transition-all duration-500 group-hover:bg-white group-hover:border-blue-200 group-hover:shadow-lg group-hover:shadow-blue-500/5 group-hover:-translate-y-1">
                                                        <p className="text-xs font-mono font-bold text-slate-600 break-all leading-relaxed tracking-wider">
                                                            {recharge.FTcode}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <p className="text-[10px] font-black text-slate-400 leading-none">Auth Channel</p>
                                                    <div className="px-5 py-2.5 bg-slate-900 font-black rounded-2xl w-fit shadow-xl shadow-slate-900/10 hover:scale-105 transition-transform">
                                                        <p className="text-[10px] text-white tracking-widest">{recharge.paymentMethod || 'Master'}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Controls */}
                                            <div className="pt-8 border-t border-slate-50 flex items-center gap-4">
                                                {recharge.status !== 'verified' && (
                                                    <button
                                                        onClick={() => setConfirmAction({ type: 'reject', data: recharge })}
                                                        disabled={verifying === recharge.id}
                                                        className="h-14 px-8 rounded-2xl bg-white border-2 border-red-50 text-red-600 font-black text-[10px] tracking-widest hover:bg-red-50 hover:border-red-100 transition-all active:scale-95 disabled:opacity-50"
                                                    >
                                                        Discard Entry
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => recharge.status !== 'verified' && setConfirmAction({ type: 'verify', data: recharge })}
                                                    disabled={verifying === recharge.id || recharge.status === 'verified'}
                                                    className={`flex-1 h-14 rounded-2xl font-black text-[10px] tracking-widest transition-all flex items-center justify-center gap-3 
                                                    ${recharge.status === 'verified'
                                                            ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-100'
                                                            : 'bg-blue-600 text-white shadow-[0_20px_40px_-15px_rgba(37,99,235,0.4)] hover:bg-blue-700 hover:shadow-blue-500/40 active:scale-[0.98] disabled:opacity-30'
                                                        } `}
                                                >
                                                    {recharge.status === 'verified' ? (
                                                        <><CheckCircle2 size={18} /> Transaction Cleared</>
                                                    ) : verifying === recharge.id ? (
                                                        <Loader2 className="animate-spin" size={18} />
                                                    ) : (
                                                        'Validate & Add Credit'
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-32 space-y-6 bg-gradient-to-b from-white/50 to-slate-50/20 backdrop-blur-3xl border border-dashed border-slate-200 rounded-[4rem] group hover:border-blue-300/50 transition-all duration-700">
                                <div className="w-24 h-24 bg-white shadow-2xl shadow-slate-200 rounded-[2rem] flex items-center justify-center text-slate-300 group-hover:scale-110 group-hover:rotate-12 transition-all duration-700 border border-slate-50">
                                    <ShieldCheck size={40} className="group-hover:text-blue-500 transition-colors" />
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <p className="text-slate-900 font-black text-xs tracking-widest">Operational Readiness</p>
                                    <p className="text-slate-400 font-bold text-[10px]">No active transactions found in queue</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
