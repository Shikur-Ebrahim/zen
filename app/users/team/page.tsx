"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ChevronLeft, Users, Trophy, Wallet, UserCircle, Search, Layers, Star, Coins, Loader2 } from "lucide-react";
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

export default function TeamPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'A' | 'B' | 'C' | 'D'>('A');
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

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push("/");
                return;
            }

            try {
                // 1. Fetch Dynamic Settings
                const settingsSnap = await getDoc(doc(db, "settings", "referral"));
                const fetchedRates = settingsSnap.exists() ? settingsSnap.data() : { levelA: 12, levelB: 7, levelC: 4, levelD: 2 };
                setRates(fetchedRates as any);

                // 2. Fetch all 4 levels in parallel using fetched rates
                const levels = [
                    { key: 'inviterA', pct: (fetchedRates.levelA || 12) / 100, label: 'A' },
                    { key: 'inviterB', pct: (fetchedRates.levelB || 7) / 100, label: 'B' },
                    { key: 'inviterC', pct: (fetchedRates.levelC || 4) / 100, label: 'C' },
                    { key: 'inviterD', pct: (fetchedRates.levelD || 2) / 100, label: 'D' }
                ];

                const promises = levels.map(async (level) => {
                    const q = query(collection(db, "users"), where(level.key, "==", user.uid));
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

                // Get today's date string
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
                setLoading(false);
            } finally {
                setLoading(false);
            }
        });

        // Safety timeout to prevent permanent loading state
        const loadingTimeout = setTimeout(() => {
            setLoading(false);
        }, 5000);

        return () => {
            unsubscribe();
            clearTimeout(loadingTimeout);
        };
    }, [router, mounted]);

    const tabs = [
        { id: 'A', label: 'Level 1', pct: `${rates.levelA}%` },
        { id: 'B', label: 'Level 2', pct: `${rates.levelB}%` },
        { id: 'C', label: 'Level 3', pct: `${rates.levelC}%` },
        { id: 'D', label: 'Level 4', pct: `${rates.levelD}%` },
    ];

    const formatPhone = (phone: string) => {
        if (phone.length < 6) return phone;
        return phone.substring(0, 4) + "****" + phone.substring(phone.length - 2);
    };


    if (!mounted || loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
            </div>
        );
    }

    const currentMembers = activeTab === 'all'
        ? [...teamData.A, ...teamData.B, ...teamData.C, ...teamData.D]
        : teamData[activeTab];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 pb-32 font-sans selection:bg-indigo-500/30">
            {/* Background Gradients */}
            <div className="fixed top-0 left-0 right-0 h-[500px] bg-indigo-900/20 blur-[120px] pointer-events-none"></div>

            {/* Header */}
            <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors active:scale-95"
                    >
                        <ChevronLeft size={22} />
                    </button>
                    <h1 className="text-base font-black uppercase tracking-widest text-white">Team Overview</h1>
                    <div className="w-10" />
                </div>
            </div>

            <div className="max-w-lg mx-auto p-4 space-y-6">

                {/* Circular Asset Gauge & Stats Section */}
                <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-6 sm:p-8 shadow-2xl shadow-indigo-950/20 border border-white/5 mb-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <div className="flex flex-col sm:flex-row items-center gap-8 sm:gap-10 relative z-10">
                        {/* 3D Circular Asset Gauge */}
                        <div className="relative w-40 h-40 shrink-0 flex items-center justify-center transform hover:scale-105 transition-transform duration-500 perspective-1000">
                            {/* Rotating Ring */}
                            <div className="absolute inset-0 rounded-full border-[6px] border-white/5 border-t-indigo-500 border-l-indigo-500 animate-[spin_8s_linear_infinite]"></div>
                            <div className="absolute inset-2 rounded-full border-[2px] border-dashed border-white/10 animate-[spin_12s_linear_infinite_reverse]"></div>

                            <svg className="w-full h-full -rotate-90 drop-shadow-xl transform preserve-3d" viewBox="0 0 100 100">
                                <defs>
                                    <linearGradient id="assetGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#6366f1" />
                                        <stop offset="100%" stopColor="#8b5cf6" />
                                    </linearGradient>
                                    <filter id="glow">
                                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                                        <feMerge>
                                            <feMergeNode in="coloredBlur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                </defs>

                                {/* Track */}
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    fill="transparent"
                                    stroke="#1e293b"
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                />
                                {/* Progress Indicator */}
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    fill="transparent"
                                    stroke="url(#assetGradient)"
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    strokeDasharray="251.2"
                                    strokeDashoffset="60"
                                    filter="url(#glow)"
                                    className="animate-[dash_1.5s_ease-out_forwards]"
                                />
                            </svg>

                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2 animate-in fade-in zoom-in duration-700">
                                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center mb-1 shadow-inner animate-bounce-slow border border-indigo-500/20">
                                    <Trophy size={16} className="text-indigo-400 fill-indigo-400" />
                                </div>
                                <span className="text-[10px] font-black text-indigo-200 uppercase tracking-widest leading-tight mb-0.5">Assets</span>
                                <span className="font-black text-white text-sm tabular-nums leading-none tracking-tight">
                                    {stats.totalTeamRecharge >= 1000000 ? (stats.totalTeamRecharge / 1000000).toFixed(1) + "M" : stats.totalTeamRecharge.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* List Stats */}
                        <div className="flex-1 w-full space-y-5">
                            <div className="bg-white/5 p-4 rounded-3xl border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    Total Income <div className="h-[1px] flex-1 bg-white/10"></div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-4xl sm:text-3xl font-black text-white tabular-nums leading-none tracking-tight">
                                        {stats.totalCommission.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </p>
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-amber-400/20 blur-md opacity-40 animate-pulse"></div>
                                        <Coins size={36} className="text-amber-500 fill-amber-500/20 drop-shadow-[0_4px_4px_rgba(245,158,11,0.2)] animate-[bounce_3s_infinite]" strokeWidth={2.5} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/5 p-3 rounded-2xl border border-white/5 shadow-sm flex flex-col justify-center hover:bg-white/10 transition-colors">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">New Today</span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Users size={14} className="text-emerald-400" />
                                        <span className="font-black text-white text-sm">+{stats.todayJoined}</span>
                                    </div>
                                </div>
                                <div className="bg-white/5 p-3 rounded-2xl border border-white/5 shadow-sm flex flex-col justify-center hover:bg-white/10 transition-colors">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Team Size</span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Layers size={14} className="text-blue-400" />
                                        <span className="font-black text-white text-sm">{stats.totalMembers}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Invite Banner */}
                <button
                    onClick={() => router.push("/users/invite")}
                    className="w-full relative h-[100px] rounded-[2rem] overflow-hidden group border border-white/5 shadow-lg active:scale-[0.98] transition-all"
                >
                    <img
                        src="/invite_banner.png"
                        alt="Invite"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent"></div>
                    <div className="absolute inset-0 flex items-center justify-between px-8">
                        <div>
                            <h3 className="text-white font-black text-lg tracking-tight uppercase">Invite Friends</h3>
                            <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest mt-1">Earn Real Cash Rewards</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                            <ChevronLeft size={20} className="rotate-180 text-white" />
                        </div>
                    </div>
                </button>

                {/* Level Selectors */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Team Levels</h3>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ratio: {rates[`level${activeTab}` as keyof typeof rates]}%</div>
                    </div>

                    <div className="bg-slate-900 p-1.5 rounded-2xl border border-white/5 flex">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 relative overflow-hidden ${activeTab === tab.id
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                                    : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Member List */}
                <div className="space-y-3 min-h-[300px]">
                    {currentMembers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 border border-dashed border-white/5 rounded-[2.5rem] bg-slate-900/20">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-gray-600">
                                <Search size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-400">No members found</p>
                                <p className="text-[10px] text-gray-600 mt-1 uppercase tracking-widest">Share your link to grow your team</p>
                            </div>
                        </div>
                    ) : (
                        currentMembers.map((member, idx) => (
                            <div
                                key={member.uid}
                                className="bg-white/5 backdrop-blur-sm rounded-[1.8rem] p-4 border border-white/5 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500 hover:bg-white/10 transition-colors"
                                style={{ animationDelay: `${idx * 50}ms` }}
                            >
                                <div className="w-12 h-12 shrink-0 rounded-2xl overflow-hidden border border-white/10 relative bg-slate-800">
                                    <img
                                        src={encodeURI(`/level ${member.level === 'A' ? 1 : member.level === 'B' ? 2 : member.level === 'C' ? 3 : 4}.jpg`)}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="text-sm font-bold text-gray-200 truncate">{formatPhone(member.phoneNumber)}</h4>
                                        <span className="text-emerald-400 text-xs font-black tracking-tight">+{member.rewardEarned.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                                                Recharge {member.totalRecharge > 999 ? (member.totalRecharge / 1000).toFixed(1) + 'k' : member.totalRecharge}
                                            </span>
                                        </div>
                                        <span className="text-[9px] font-medium text-gray-600">
                                            {new Date(member.joinedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
