"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    addDoc,
    serverTimestamp,
    increment,
    onSnapshot,
    orderBy
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
    ChevronLeft,
    Search,
    Loader2,
    User,
    Users,
    CircleDollarSign,
    TrendingUp,
    ShieldCheck,
    ArrowRight,
    CheckCircle2,
    Crown,
    AlertCircle,
    Menu,
    Clock,
    Copy,
    Check,
    BarChart3,
    Activity
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import { toast } from "sonner";

export default function AdminVipUpgradePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [targetUser, setTargetUser] = useState<any>(null);
    const [userStats, setUserStats] = useState<any>(null);
    const [vipRules, setVipRules] = useState<any[]>([]);
    const [candidates, setCandidates] = useState<any[]>([]);
    const [scanning, setScanning] = useState(false);

    const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
    const [editableSalary, setEditableSalary] = useState<number>(0);
    const [processing, setProcessing] = useState(false);
    const [salaryOption, setSalaryOption] = useState<"immediate" | "delayed">("delayed");

    // Leader Intelligence states
    const [searchingIntel, setSearchingIntel] = useState(false);
    const [intelResult, setIntelResult] = useState<any>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            const isMaster = localStorage.getItem("admin_session") === "true";
            if (!user && !isMaster) {
                router.push("/");
            } else {
                setLoading(false);
            }
        });

        // Load VIP Rules
        const qRules = query(collection(db, "VipRules"), orderBy("createdAt", "asc"));
        const unsubscribeRules = onSnapshot(qRules, (snapshot) => {
            const rules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            rules.sort((a: any, b: any) => {
                const numA = parseInt(a.level?.replace(/\D/g, '') || "0");
                const numB = parseInt(b.level?.replace(/\D/g, '') || "0");
                return numA - numB;
            });
            setVipRules(rules);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeRules();
        };
    }, [router]);

    useEffect(() => {
        if (selectedCandidate) {
            setEditableSalary(Number(selectedCandidate.nextRule.monthlySalary) || 0);
        }
    }, [selectedCandidate]);

    // Automated Sweep Logic
    useEffect(() => {
        if (!loading && vipRules.length > 0) {
            runAutomatedSweep();
        }
    }, [loading, vipRules]);

    const runAutomatedSweep = async () => {
        setScanning(true);
        try {
            // 1. Fetch all users
            const userSnapshot = await getDocs(collection(db, "users"));
            const allUsers = userSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as any[];

            const eligibleCandidates: any[] = [];

            // 2. Identify potential candidates (those who aren't at the max VIP level)
            for (const user of allUsers) {
                const currentVip = user.vip ?? 0;
                const currentVipNum = typeof currentVip === 'number'
                    ? currentVip
                    : parseInt(currentVip.toString().replace(/\D/g, '') || "0");
                const nextVipNum = currentVipNum + 1;

                const nextRule = vipRules.find(r => {
                    const rNum = parseInt(r.level?.replace(/\D/g, '') || "0");
                    return rNum === nextVipNum;
                });

                if (nextRule) {
                    // Use pre-calculated team stats for efficiency
                    const totalMembers = user.investedTeamSize || 0;
                    const totalAssets = user.teamAssets || 0;

                    const sizeMet = totalMembers >= (Number(nextRule.investedTeamSize) || 0);
                    const assetsMet = totalAssets >= (Number(nextRule.totalTeamAssets) || 0);

                    if (sizeMet && assetsMet) {
                        eligibleCandidates.push({
                            ...user,
                            teamStats: { totalMembers, totalAssets },
                            nextRule
                        });

                        // Ensure Firestore stays in sync with sweep results
                        if (!user.isVipEligible) {
                            await updateDoc(doc(db, "users", user.uid), { isVipEligible: true });
                        }
                    } else if (user.isVipEligible) {
                        // Clear if no longer eligible
                        await updateDoc(doc(db, "users", user.uid), { isVipEligible: false });
                    }
                }
            }

            setCandidates(eligibleCandidates);
        } catch (error) {
            console.error("Sweep error:", error);
        } finally {
            setScanning(false);
        }
    };

    const handleUpgrade = async () => {
        if (!selectedCandidate) return;

        setProcessing(true);
        try {
            const { nextRule } = selectedCandidate;
            const userRef = doc(db, "users", selectedCandidate.uid);

            const upgradeData: any = {
                vip: parseInt(nextRule.level.replace(/\D/g, '') || "0"),
                monthlySalary: editableSalary,
                isVipEligible: false // Clear eligibility after upgrade
            };

            if (salaryOption === "immediate") {
                upgradeData.balance = increment(editableSalary);
            }

            await updateDoc(userRef, upgradeData);

            // Log Upgrade
            await addDoc(collection(db, "VipUpgrades"), {
                userId: selectedCandidate.uid,
                phoneNumber: selectedCandidate.phoneNumber,
                oldVip: typeof selectedCandidate.vip === 'number'
                    ? selectedCandidate.vip
                    : parseInt(selectedCandidate.vip?.toString().replace(/\D/g, '') || "0"),
                newVip: parseInt(nextRule.level.replace(/\D/g, '') || "0"),
                monthlySalary: editableSalary,
                salaryOption,
                timestamp: serverTimestamp(),
                teamSizeAtUpgrade: selectedCandidate.teamStats.totalMembers,
                teamAssetsAtUpgrade: selectedCandidate.teamStats.totalAssets
            });

            alert(`Successfully upgraded ${selectedCandidate.phoneNumber} to ${nextRule.level}`);
            setSelectedCandidate(null);
            runAutomatedSweep(); // Refresh list

        } catch (error) {
            console.error("Upgrade error:", error);
            alert("Failed to upgrade user");
        } finally {
            setProcessing(false);
        }
    };

    const handleSearchIntel = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;

        setSearchingIntel(true);
        setIntelResult(null);
        try {
            // 1. Find the leader
            const leadersQuery = query(
                collection(db, "users"),
                where("phoneNumber", "==", searchQuery.trim())
            );
            const leaderSnap = await getDocs(leadersQuery);

            if (leaderSnap.empty) {
                toast.error("Leader not found");
                return;
            }

            const leaderDoc = leaderSnap.docs[0];
            const leaderData = { uid: leaderDoc.id, ...leaderDoc.data() } as any;

            // 2. Fetch all levels in parallel
            const levels = ['inviterA', 'inviterB', 'inviterC', 'inviterD'];
            const teamStats: any = { A: [], B: [], C: [], D: [] };
            let totalActiveAssets = 0;
            let totalActiveMembers = 0;

            const promises = levels.map(async (level) => {
                const q = query(collection(db, "users"), where(level, "==", leaderData.uid));
                const snapshot = await getDocs(q);
                const activeMembers = snapshot.docs
                    .map(doc => ({ uid: doc.id, ...doc.data() } as any))
                    .filter(m => (m.totalRecharge || 0) > 0);

                const levelKey = level.replace('inviter', '');
                teamStats[levelKey] = activeMembers;

                activeMembers.forEach(m => {
                    totalActiveAssets += (m.totalRecharge || 0);
                    totalActiveMembers++;
                });
            });

            await Promise.all(promises);

            setIntelResult({
                leader: leaderData,
                stats: teamStats,
                summary: {
                    totalActiveMembers,
                    totalActiveAssets
                }
            });
            toast.success("Intelligence report generated");
        } catch (error) {
            console.error("Intel error:", error);
            toast.error("Failed to fetch leader intelligence");
        } finally {
            setSearchingIntel(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Phone number copied");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex">
            <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Header */}
                <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between z-30 md:hidden">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        <Menu size={24} className="text-slate-600" />
                    </button>
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={20} className="text-indigo-600" />
                        <h1 className="text-sm font-black text-slate-900 uppercase tracking-widest">VIP Upgrade</h1>
                    </div>
                    <div className="w-10"></div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">

                    {/* Leader Intelligence Search & Dashboard */}
                    <section className="space-y-6">
                        <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/20">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Activity size={18} className="text-indigo-600" />
                                        Leader Intelligence
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deep Work Track & Performance Sync</p>
                                </div>
                                <form onSubmit={handleSearchIntel} className="relative group w-full md:max-w-md">
                                    <input
                                        type="tel"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by phone number..."
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    />
                                    <button
                                        type="submit"
                                        disabled={searchingIntel}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 active:scale-90 transition-transform disabled:opacity-50"
                                    >
                                        {searchingIntel ? <Loader2 size={18} className="animate-spin" /> : <ChevronLeft size={20} className="rotate-180" />}
                                    </button>
                                </form>
                            </div>

                            {intelResult && (
                                <div className="mt-10 animate-in fade-in slide-in-from-top-4 duration-500">
                                    {/* Intel Summary Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                                        <div className="bg-indigo-50/50 rounded-3xl p-6 border border-indigo-100/50 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Active Team</p>
                                                <p className="text-2xl font-black text-indigo-900 leading-none">{intelResult.summary.totalActiveMembers}</p>
                                            </div>
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                                <Users size={20} />
                                            </div>
                                        </div>
                                        <div className="bg-emerald-50/50 rounded-3xl p-6 border border-emerald-100/50 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Team Assets</p>
                                                <p className="text-2xl font-black text-emerald-900 leading-none">{intelResult.summary.totalActiveAssets.toLocaleString()}</p>
                                            </div>
                                            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
                                                <CircleDollarSign size={20} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Level Breakdown Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {['A', 'B', 'C', 'D'].map((level) => (
                                            <div key={level} className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                                                <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">Level {level}</h4>
                                                    <span className="bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-[9px] font-black text-slate-500">
                                                        {intelResult.stats[level].length} Active
                                                    </span>
                                                </div>
                                                <div className="max-h-[300px] overflow-y-auto">
                                                    {intelResult.stats[level].length > 0 ? (
                                                        <div className="divide-y divide-slate-50">
                                                            {intelResult.stats[level].map((member: any) => (
                                                                <div key={member.uid} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group/row">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden shrink-0">
                                                                            <img src="/avator profile.jpg" alt="" className="w-full h-full object-cover" />
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <p className="text-[10px] font-black text-slate-900 truncate">{member.phoneNumber}</p>
                                                                            <p className="text-[8px] font-bold text-slate-400 uppercase font-mono">VIP {member.vip || 0}</p>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => copyToClipboard(member.phoneNumber)}
                                                                        className="p-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity text-slate-400 hover:text-indigo-600"
                                                                    >
                                                                        <Copy size={12} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="p-12 text-center">
                                                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-200 mx-auto mb-3">
                                                                <Users size={16} />
                                                            </div>
                                                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">No Active Members</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-between">
                                        <button
                                            onClick={() => setIntelResult(null)}
                                            className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
                                        >
                                            Close Intel Report
                                        </button>
                                        <div className="flex items-center gap-2 text-emerald-500">
                                            <ShieldCheck size={14} />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Verified Work Track</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Eligible Candidates Grid */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-3">
                                <Crown className="text-amber-500" size={18} />
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Upgrade Candidates</h3>
                            </div>
                            {candidates.length > 0 && (
                                <span className="bg-emerald-100 text-emerald-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-200">
                                    {candidates.length} Detected
                                </span>
                            )}
                        </div>

                        {scanning ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-48 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm"></div>
                                ))}
                            </div>
                        ) : candidates.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {candidates.map((user) => (
                                    <div
                                        key={user.uid}
                                        onClick={() => setSelectedCandidate(user)}
                                        className="group bg-white rounded-[2.5rem] p-6 shadow-sm border border-white hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-600/5 transition-all duration-500 cursor-pointer active:scale-95 overflow-hidden relative"
                                    >
                                        <div className="absolute top-0 right-0 p-4">
                                            <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-emerald-100">
                                                Ready
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-indigo-50 transition-colors overflow-hidden">
                                                <img
                                                    src="/avator profile.jpg"
                                                    alt="Profile"
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-black text-slate-900 tracking-tight">{user.phoneNumber}</h4>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            copyToClipboard(user.phoneNumber);
                                                        }}
                                                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                                                    >
                                                        <Copy size={12} />
                                                    </button>
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{user.vip || "VIP 0"}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-slate-50/50 rounded-2xl p-3 border border-slate-100">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Invested</p>
                                                <p className="text-xs font-black text-slate-800">{user.teamStats.totalMembers}</p>
                                            </div>
                                            <div className="bg-slate-50/50 rounded-2xl p-3 border border-slate-100">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Assets</p>
                                                <p className="text-xs font-black text-slate-800">{Number(user.teamStats.totalAssets).toLocaleString()}</p>
                                            </div>
                                        </div>

                                        <div className="mt-6 flex items-center justify-between p-1">
                                            <div className="flex items-center gap-2">
                                                <ArrowRight size={14} className="text-indigo-500" />
                                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{user.nextRule.level}</span>
                                            </div>
                                            <ChevronLeft size={14} className="text-slate-200 rotate-180" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 text-slate-300 gap-6">
                                <ShieldCheck size={64} className="opacity-10" />
                                <div className="text-center px-8">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">All Leaders Updated</h4>
                                    <p className="text-[10px] font-bold mt-2 leading-relaxed">No users currently qualify for a higher VIP level based on active rules.</p>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Detail Modal/Overlay */}
                    {selectedCandidate && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8">
                            <div
                                className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-500"
                                onClick={() => setSelectedCandidate(null)}
                            />
                            <div className="relative w-full h-full md:h-auto md:max-w-xl bg-white md:rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col">
                                {/* Premium Gradient Header */}
                                <div className="relative px-8 pt-12 pb-8 bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 overflow-hidden shrink-0">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl -ml-16 -mb-16"></div>

                                    <div className="relative z-10 flex items-center justify-between">
                                        <div className="space-y-1">
                                            <h3 className="text-2xl font-black text-white tracking-tight uppercase">Leader Upgrade</h3>
                                            <p className="text-indigo-100/60 text-[10px] font-black uppercase tracking-[0.3em]">Validation Protocol</p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedCandidate(null)}
                                            className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-white/20 transition-all active:scale-90"
                                        >
                                            <ChevronLeft size={24} className="rotate-90" />
                                        </button>
                                    </div>

                                    {/* Elevated Profile Section */}
                                    <div className="mt-10 flex items-center gap-6 bg-white/10 backdrop-blur-xl p-5 rounded-3xl border border-white/20 shadow-xl shadow-blue-900/20">
                                        <div className="relative shrink-0">
                                            <div className="absolute inset-0 bg-white/20 rounded-2xl blur-md opacity-50"></div>
                                            <div className="relative w-16 h-16 rounded-2xl border-2 border-white/50 overflow-hidden shadow-lg">
                                                <img src="/avator profile.jpg" alt="Profile" className="w-full h-full object-cover" />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-xl font-black text-white tracking-tight">{selectedCandidate.phoneNumber}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                                                <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">{selectedCandidate.vip || "VIP 0"}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-slate-50/50">
                                    {/* Decision Matrix */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                                <Users size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Team Size</p>
                                                <p className="text-lg font-black text-slate-900">{selectedCandidate.teamStats.totalMembers}</p>
                                            </div>
                                        </div>
                                        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                <CircleDollarSign size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Team Assets</p>
                                                <p className="text-lg font-black text-slate-900">{Number(selectedCandidate.teamStats.totalAssets).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Editable Rewards Section */}
                                    <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50 rounded-[2.5rem] p-8 border border-emerald-100 shadow-xl shadow-emerald-900/5 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors"></div>

                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                                                <TrendingUp size={20} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-emerald-900 uppercase tracking-tighter">Successive Promotion</h4>
                                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">TARGET: {selectedCandidate.nextRule.level}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            {/* Advanced Salary Input */}
                                            <div className="relative">
                                                <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2 block px-2">Adjust Monthly Salary (ETB)</label>
                                                <div className="relative group/input">
                                                    <input
                                                        type="number"
                                                        value={editableSalary}
                                                        onChange={(e) => setEditableSalary(Number(e.target.value))}
                                                        className="w-full bg-white border-2 border-emerald-100 rounded-2xl py-5 px-6 text-2xl font-black text-emerald-600 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-emerald-200"
                                                        placeholder="0.00"
                                                    />
                                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                        <span className="text-xs font-black text-emerald-200 uppercase tracking-widest">ETB</span>
                                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                                            <CheckCircle2 size={16} className="text-emerald-500" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 p-4 bg-white/60 rounded-2xl border border-emerald-50">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                                                    <ShieldCheck size={18} />
                                                </div>
                                                <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-tight">5-Year Loyalty Rewards Integration Active</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Strategy Selector */}
                                    <div className="space-y-4">
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">Reward Distribution Strategy</h5>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={() => setSalaryOption("delayed")}
                                                className={`group relative overflow-hidden rounded-3xl p-5 border-2 transition-all duration-300 ${salaryOption === 'delayed' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                                            >
                                                <div className="relative z-10 space-y-1">
                                                    <h6 className={`text-xs font-black uppercase tracking-tight ${salaryOption === 'delayed' ? 'text-indigo-900' : 'text-slate-900'}`}>Deferred</h6>
                                                    <p className={`text-[9px] font-bold uppercase tracking-widest ${salaryOption === 'delayed' ? 'text-indigo-600' : 'text-slate-400'}`}>Start Next Month</p>
                                                </div>
                                                {salaryOption === 'delayed' && <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-indigo-600 rounded-full blur-xl opacity-20"></div>}
                                            </button>
                                            <button
                                                onClick={() => setSalaryOption("immediate")}
                                                className={`group relative overflow-hidden rounded-3xl p-5 border-2 transition-all duration-300 ${salaryOption === 'immediate' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                                            >
                                                <div className="relative z-10 space-y-1 text-right">
                                                    <h6 className={`text-xs font-black uppercase tracking-tight ${salaryOption === 'immediate' ? 'text-indigo-900' : 'text-slate-900'}`}>Standard</h6>
                                                    <p className={`text-[9px] font-bold uppercase tracking-widest ${salaryOption === 'immediate' ? 'text-indigo-600' : 'text-slate-400'}`}>Credit Balance Now</p>
                                                </div>
                                                {salaryOption === 'immediate' && <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-indigo-600 rounded-full blur-xl opacity-20"></div>}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 bg-white border-t border-slate-50 shrink-0">
                                    <button
                                        onClick={handleUpgrade}
                                        disabled={processing}
                                        className="w-full relative group overflow-hidden rounded-[2.5rem] p-6 active:scale-95 transition-all shadow-2xl shadow-emerald-500/20"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 group-hover:scale-105 transition-transform duration-500"></div>
                                        <div className="relative z-10 flex items-center justify-center gap-4">
                                            {processing ? (
                                                <Loader2 className="animate-spin text-white" size={24} />
                                            ) : (
                                                <ShieldCheck size={24} className="text-white" />
                                            )}
                                            <span className="text-lg font-black text-white uppercase tracking-[0.2em]">Finalize Upgrade</span>
                                        </div>
                                        <div className="absolute top-0 right-0 w-32 h-full bg-white/10 skew-x-[45deg] translate-x-32 group-hover:translate-x-[-150%] transition-transform duration-1000"></div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div >
        </div >
    );
}
