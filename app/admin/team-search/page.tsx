"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    limit as firestoreLimit
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import {
    Search,
    Loader2,
    Menu,
    RefreshCcw,
    Users,
    Phone,
    Trophy,
    Layers,
    Coins,
    ChevronLeft,
    Star,
    Wallet
} from "lucide-react";
import { toast } from "sonner";

interface TeamMember {
    uid: string;
    phoneNumber: string;
    totalRecharge: number;
    rewardEarned: number;
    joinedAt: string;
    level: string;
}

interface TeamData {
    A: TeamMember[];
    B: TeamMember[];
    C: TeamMember[];
    D: TeamMember[];
}

export default function AdminTeamSearch() {
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [searchPhone, setSearchPhone] = useState("");
    const [searchResult, setSearchResult] = useState<any>(null);

    const [activeTab, setActiveTab] = useState<'A' | 'B' | 'C' | 'D'>('A');
    const [teamData, setTeamData] = useState<TeamData>({ A: [], B: [], C: [], D: [] });
    const [stats, setStats] = useState({
        totalMembers: 0,
        totalCommission: 0,
        totalTeamRecharge: 0,
        todayJoined: 0,
        levelCounts: { A: 0, B: 0, C: 0, D: 0 },
        levelAssets: { A: 0, B: 0, C: 0, D: 0 }
    });
    const [rates, setRates] = useState({ levelA: 12, levelB: 7, levelC: 4, levelD: 2 });

    const [viewMode, setViewMode] = useState<'team' | 'products'>('team');
    const [userOrders, setUserOrders] = useState<any[]>([]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            const isMaster = localStorage.getItem("admin_session") === "true";
            if (!user && !isMaster) {
                router.push("/");
            } else {
                setLoading(false);
                fetchRates();
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchRates = async () => {
        try {
            const settingsSnap = await getDoc(doc(db, "settings", "referral"));
            if (settingsSnap.exists()) {
                setRates(settingsSnap.data() as any);
            }
        } catch (error) {
            console.error("Error fetching rates:", error);
        }
    };

    const handleSearch = async () => {
        if (!searchPhone.trim()) {
            toast.error("Please enter a phone number");
            return;
        }

        setIsSearching(true);
        setSearchResult(null);
        setTeamData({ A: [], B: [], C: [], D: [] });
        setUserOrders([]);

        try {
            let phoneToSearch = searchPhone.trim();
            if (!phoneToSearch.startsWith("+")) {
                const qPlus = query(collection(db, "users"), where("phoneNumber", "==", "+" + phoneToSearch));
                const snapPlus = await getDocs(qPlus);
                if (!snapPlus.empty) {
                    const user = { id: snapPlus.docs[0].id, ...snapPlus.docs[0].data() };
                    setSearchResult(user);
                    fetchTeamData(user.id);
                    fetchUserOrders(user.id);
                    return;
                }
            }

            const q = query(collection(db, "users"), where("phoneNumber", "==", phoneToSearch));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                toast.error("No user found with this phone number");
            } else {
                const user = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
                setSearchResult(user);
                fetchTeamData(user.id);
                fetchUserOrders(user.id);
            }
        } catch (error) {
            console.error("Search error:", error);
            toast.error("Failed to search user");
        } finally {
            setIsSearching(false);
        }
    };

    const fetchUserOrders = async (uid: string) => {
        try {
            const q = query(collection(db, "UserOrders"), where("userId", "==", uid));
            const snapshot = await getDocs(q);
            const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUserOrders(orders);
        } catch (error) {
            console.error("Error fetching orders:", error);
            toast.error("Failed to load product data");
        }
    };

    const fetchTeamData = async (uid: string) => {
        // ... existing fetchTeamData content ...
        try {
            const levels = [
                { key: 'inviterA', pct: (rates.levelA || 12) / 100, label: 'A' },
                { key: 'inviterB', pct: (rates.levelB || 7) / 100, label: 'B' },
                { key: 'inviterC', pct: (rates.levelC || 4) / 100, label: 'C' },
                { key: 'inviterD', pct: (rates.levelD || 2) / 100, label: 'D' }
            ];

            const promises = levels.map(async (level) => {
                const q = query(collection(db, "users"), where(level.key, "==", uid));
                const snapshot = await getDocs(q);
                return {
                    label: level.label,
                    members: snapshot.docs.map(doc => {
                        const data = doc.data();
                        const totalRecharge = data.totalRecharge || 0;
                        return {
                            uid: doc.id,
                            phoneNumber: data.phoneNumber || "Unknown",
                            totalRecharge: totalRecharge,
                            rewardEarned: totalRecharge * level.pct,
                            joinedAt: data.createdAt,
                            level: level.label
                        };
                    })
                };
            });

            const results = await Promise.all(promises);

            const newTeamData: any = {};
            let count = 0;
            let commission = 0;
            let teamRecharge = 0;
            let todayCount = 0;

            const levelCounts = { A: 0, B: 0, C: 0, D: 0 };
            const levelAssets = { A: 0, B: 0, C: 0, D: 0 };
            const todayStr = new Date().toISOString().split('T')[0];

            results.forEach(res => {
                newTeamData[res.label] = res.members;
                count += res.members.length;
                levelCounts[res.label as keyof typeof levelCounts] = res.members.length;

                res.members.forEach(m => {
                    commission += m.rewardEarned;
                    teamRecharge += m.totalRecharge;
                    levelAssets[res.label as keyof typeof levelAssets] += m.totalRecharge;

                    if (m.joinedAt && typeof m.joinedAt === 'string' && m.joinedAt.includes(todayStr)) {
                        todayCount++;
                    }
                });
            });

            setTeamData(newTeamData);
            setStats({
                totalMembers: count,
                totalCommission: commission,
                totalTeamRecharge: teamRecharge,
                todayJoined: todayCount,
                levelCounts,
                levelAssets
            });

        } catch (error) {
            console.error("Error fetching team:", error);
            toast.error("Failed to load team data");
        }
    };

    const formatPhone = (phone: string) => {
        if (phone.length < 6) return phone;
        return phone.substring(0, 4) + "****" + phone.substring(phone.length - 2);
    };

    const formatDate = (date: any) => {
        if (!date) return "N/A";
        if (date.seconds) return new Date(date.seconds * 1000).toLocaleString();
        return new Date(date).toLocaleString();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-600" size={40} />
            </div>
        );
    }

    const tabs = [
        { id: 'A', label: 'Level 1', pct: `${rates.levelA}%` },
        { id: 'B', label: 'Level 2', pct: `${rates.levelB}%` },
        { id: 'C', label: 'Level 3', pct: `${rates.levelC}%` },
        { id: 'D', label: 'Level 4', pct: `${rates.levelD}%` },
    ];

    const currentMembers = teamData[activeTab] || [];

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <div className="flex-1 flex flex-col min-h-screen w-full text-slate-900">
                {/* Header */}
                <header className="sticky top-0 bg-white/80 backdrop-blur-xl px-6 py-6 flex items-center justify-between z-40 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="md:hidden w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600"
                        >
                            <Menu size={24} />
                        </button>
                        <div className="flex flex-col">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none">Global Tracker</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Audit User Teams & Products</p>
                        </div>
                    </div>

                    <button
                        onClick={() => window.location.reload()}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                    >
                        <RefreshCcw size={20} />
                    </button>
                </header>

                <main className="p-4 sm:p-8 max-w-md mx-auto w-full">
                    {/* Search Section */}
                    <section className="mb-10 space-y-6">
                        <div className="bg-white rounded-[2.5rem] p-6 border-2 border-slate-100 shadow-2xl shadow-slate-900/5 space-y-6">
                            <div className="relative group">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors">
                                    <Phone size={20} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Enter user phone number..."
                                    value={searchPhone}
                                    onChange={(e) => setSearchPhone(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                    className="w-full h-16 pl-14 pr-6 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-indigo-400 focus:bg-white transition-all text-sm font-bold tracking-widest text-slate-900"
                                />
                            </div>
                            <button
                                onClick={handleSearch}
                                disabled={isSearching}
                                className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
                            >
                                {isSearching ? <Loader2 className="animate-spin" size={20} /> : "Search Account"}
                            </button>
                        </div>
                    </section>

                    {searchResult && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* User Header */}
                            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-[2.5rem] p-8 mb-8 text-white shadow-2xl shadow-indigo-900/20">
                                <div className="absolute top-0 right-0 p-4">
                                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${searchResult.isBlocked ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                                        {searchResult.isBlocked ? 'Blocked' : 'Active'}
                                    </div>
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Audit Target</p>
                                <h3 className="text-3xl font-black tracking-tighter mb-6">{searchResult.phoneNumber}</h3>

                                <div className="grid grid-cols-2 gap-4 relative z-10">
                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/10">
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Recharge (Credits)</p>
                                        <p className="text-xl font-black tracking-tight">{searchResult.Recharge?.toLocaleString() || 0} <span className="text-[10px] opacity-60">ETB</span></p>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/10">
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Total Recharge</p>
                                        <p className="text-xl font-black tracking-tight">{searchResult.totalRecharge?.toLocaleString() || 0} <span className="text-[10px] opacity-60">ETB</span></p>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/10">
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Balance</p>
                                        <p className="text-xl font-black tracking-tight">{searchResult.balance?.toLocaleString() || 0} <span className="text-[10px] opacity-60">ETB</span></p>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/10">
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">VIP Rank</p>
                                        <p className="text-xl font-black tracking-tight flex items-center gap-2">
                                            <Star size={18} className="text-amber-400 fill-amber-400" />
                                            <span>Level {searchResult.vip || 0}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* View Switcher Toggle */}
                            <div className="flex p-1.5 bg-white border border-slate-100 rounded-3xl mb-8 shadow-sm">
                                <button
                                    onClick={() => setViewMode('team')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest transition-all ${viewMode === 'team' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 scale-[1.02]' : 'text-slate-400 hover:bg-slate-50'}`}
                                >
                                    <Users size={16} />
                                    <span>Team Data</span>
                                </button>
                                <button
                                    onClick={() => setViewMode('products')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest transition-all ${viewMode === 'products' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-[1.02]' : 'text-slate-400 hover:bg-slate-50'}`}
                                >
                                    <Layers size={16} />
                                    <span>Product Data</span>
                                </button>
                            </div>

                            {viewMode === 'team' ? (
                                <>
                                    {/* Team Stats */}
                                    <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-slate-50 mb-8 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                                        <div className="flex flex-col items-center gap-8 relative z-10">
                                            {/* Circular Gauge */}
                                            <div className="relative w-40 h-40 shrink-0 flex items-center justify-center transform hover:scale-105 transition-transform duration-500 perspective-1000">
                                                <div className="absolute inset-0 rounded-full border-[6px] border-slate-50 border-t-indigo-500/30 border-l-indigo-500/30 animate-[spin_8s_linear_infinite]"></div>
                                                <div className="absolute inset-2 rounded-full border-[2px] border-dashed border-slate-200 animate-[spin_12s_linear_infinite_reverse]"></div>

                                                <svg className="w-full h-full -rotate-90 drop-shadow-xl" viewBox="0 0 100 100">
                                                    <defs>
                                                        <linearGradient id="assetGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                            <stop offset="0%" stopColor="#6366f1" />
                                                            <stop offset="100%" stopColor="#8b5cf6" />
                                                        </linearGradient>
                                                    </defs>
                                                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ecf0f5" strokeWidth="8" strokeLinecap="round" />
                                                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="url(#assetGradient)" strokeWidth="8" strokeLinecap="round" strokeDasharray="251.2" strokeDashoffset="60" className="animate-[dash_1.5s_ease-out_forwards]" />
                                                </svg>

                                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center mb-1 shadow-inner animate-bounce-slow">
                                                        <Trophy size={16} className="text-indigo-500 fill-indigo-500" />
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight mb-0.5">Assets</span>
                                                    <span className="font-black text-slate-800 text-sm tabular-nums leading-none tracking-tight">
                                                        {stats.totalTeamRecharge >= 1000000 ? (stats.totalTeamRecharge / 1000000).toFixed(1) + "M" : stats.totalTeamRecharge.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Stats List */}
                                            <div className="w-full space-y-5">
                                                <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100/80">
                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                        Total Income <div className="h-[1px] flex-1 bg-slate-200"></div>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-4xl sm:text-3xl font-black text-slate-800 tabular-nums leading-none tracking-tight">
                                                            {stats.totalCommission.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                        </p>
                                                        <Coins size={36} className="text-amber-500 fill-amber-300 animate-[bounce_3s_infinite]" />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">New Today</span>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Users size={14} className="text-emerald-500" />
                                                            <span className="font-black text-slate-800 text-sm">+{stats.todayJoined}</span>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Team Size</span>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Layers size={14} className="text-blue-500" />
                                                            <span className="font-black text-slate-800 text-sm">{stats.totalMembers}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Level Tabs */}
                                    <div className="bg-white rounded-[1.8rem] p-1.5 shadow-sm border border-slate-100 flex gap-1 mb-8">
                                        {tabs.map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id as any)}
                                                className={`flex-1 py-3 px-2 rounded-2xl flex flex-col items-center transition-all duration-300 ${activeTab === tab.id
                                                    ? "bg-[#0F172A] text-white shadow-xl"
                                                    : "text-slate-400 hover:bg-slate-50"
                                                    }`}
                                            >
                                                <span className="text-[10px] font-black uppercase tracking-tighter whitespace-nowrap">{tab.label}</span>
                                                <span className={`text-[9px] font-bold mt-0.5 ${activeTab === tab.id ? "text-slate-400" : "text-slate-300"}`}>{tab.pct}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Members List */}
                                    <div className="relative pl-4 space-y-6">
                                        <div className="absolute left-6 top-6 bottom-6 w-[2px] bg-slate-100"></div>

                                        {currentMembers.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-12 text-slate-300 pl-4">
                                                <Users size={32} className="opacity-20 mb-3" />
                                                <p className="text-xs font-bold uppercase tracking-widest">No members found</p>
                                            </div>
                                        ) : (
                                            currentMembers.map((member, idx) => (
                                                <div key={member.uid} className="relative pl-10 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                                                    <div className="absolute left-[-2px] top-8 w-4 h-4 rounded-full bg-white border-2 border-indigo-400 z-10 shadow-[0_0_0_4px_rgba(129,140,248,0.1)]"></div>

                                                    <div className="bg-white rounded-[2.2rem] p-5 shadow-[0_15px_35px_rgba(0,0,0,0.03)] border border-slate-50 flex items-center justify-between group">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-16 h-16 rounded-full p-1 bg-white border border-indigo-100 shrink-0 relative shadow-sm">
                                                                <div className="w-full h-full rounded-full overflow-hidden border border-indigo-200">
                                                                    <img
                                                                        src={encodeURI(`/level ${member.level === 'A' ? 1 : member.level === 'B' ? 2 : member.level === 'C' ? 3 : 4}.jpg`)}
                                                                        alt="Avatar"
                                                                        className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="space-y-1">
                                                                <h3 className="font-extrabold text-[#1E293B] text-base tracking-tight">
                                                                    {formatPhone(member.phoneNumber)}
                                                                </h3>
                                                                <div className="bg-slate-50/80 px-4 py-1.5 rounded-full w-fit border border-slate-100 shadow-sm">
                                                                    <span className="text-[10px] font-bold text-slate-400">Recharge: </span>
                                                                    <span className="text-[10px] font-black text-[#1E293B]">{member.totalRecharge.toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="text-right flex flex-col items-end">
                                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">REWARD</span>
                                                            <span className="text-[16px] font-black text-[#10B981] tracking-tight">
                                                                +{member.rewardEarned.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-6">
                                    {userOrders.length === 0 ? (
                                        <div className="bg-white rounded-[2.5rem] p-16 border border-slate-100 flex flex-col items-center gap-6 text-center">
                                            <div className="w-20 h-20 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center">
                                                <Layers size={40} />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black text-slate-900 leading-none mb-2 tracking-tight">No Active Products</h4>
                                                <p className="text-slate-400 text-sm font-medium">This user hasn't purchased any products yet.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        userOrders.map((order, idx) => (
                                            <div key={order.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-900/5 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                                                <div className="bg-slate-900 px-8 py-6 flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                                                            <Star size={20} />
                                                        </div>
                                                        <h4 className="text-white font-black text-lg uppercase tracking-tight">{order.productName || "Product"}</h4>
                                                    </div>
                                                    <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${order.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-slate-400'}`}>
                                                        {order.status || "Unknown"}
                                                    </div>
                                                </div>

                                                <div className="p-8 space-y-8">
                                                    <div className="grid grid-cols-2 gap-8">
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Price</p>
                                                            <p className="text-2xl font-black text-slate-900">{order.price?.toLocaleString() || 0} <span className="text-[10px] text-slate-400">ETB</span></p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Daily Income</p>
                                                            <p className="text-2xl font-black text-indigo-600">+{order.dailyIncome?.toLocaleString() || 0} <span className="text-[10px] text-indigo-400">ETB</span></p>
                                                        </div>
                                                    </div>

                                                    <div className="h-px bg-slate-100 w-full" />

                                                    <div className="grid grid-cols-3 gap-4">
                                                        <div className="bg-slate-50 p-4 rounded-2xl flex flex-col justify-center items-center text-center">
                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Term</p>
                                                            <p className="font-extrabold text-slate-900 text-sm">{order.contractPeriod || 0} Days</p>
                                                        </div>
                                                        <div className="bg-slate-50 p-4 rounded-2xl flex flex-col justify-center items-center text-center">
                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Remains</p>
                                                            <p className="font-extrabold text-indigo-600 text-sm">{order.remainingDays || 0} Days</p>
                                                        </div>
                                                        <div className="bg-slate-50 p-4 rounded-2xl flex flex-col justify-center items-center text-center">
                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Profit</p>
                                                            <p className="font-extrabold text-emerald-600 text-sm">{order.totalProfit?.toLocaleString() || 0}</p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between bg-slate-50/50 px-6 py-4 rounded-2xl border border-slate-100">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Principal Income</span>
                                                            <span className="font-extrabold text-slate-900 text-sm">+{order.principalIncome?.toLocaleString() || 0} ETB</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-[10px] px-2">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-slate-400 uppercase text-[8px] tracking-widest">Purchase Date</span>
                                                                <span className="font-bold text-slate-600">{formatDate(order.purchaseDate)}</span>
                                                            </div>
                                                            <div className="flex flex-col text-right">
                                                                <span className="font-bold text-slate-400 uppercase text-[8px] tracking-widest">Last Payout Sync</span>
                                                                <span className="font-bold text-slate-600">{formatDate(order.lastSync)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
