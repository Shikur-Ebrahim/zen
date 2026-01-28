"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import {
    ChevronLeft,
    Loader2,
    CheckCircle2,
    Clock,
    CreditCard,
    Calendar,
    Hash,
    Building2,
    User as UserIcon,
    DollarSign,
    FileText,
    TrendingUp,
    Activity,
    Zap,
    Shield
} from "lucide-react";

interface RechargeRecord {
    id: string;
    FTcode: string;
    accountHolderName: string;
    accountNumber: string;
    amount: number;
    bankName: string;
    paymentMethod: string;
    phoneNumber: string;
    status: string;
    timestamp: any;
    userId: string;
    verifiedAt?: any;
}

export default function RechargeRecordsPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [records, setRecords] = useState<RechargeRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "verified" | "under review">("all");
    const [paymentMethodLogos, setPaymentMethodLogos] = useState<Record<string, string>>({});

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push("/");
                return;
            }
            setUser(currentUser);
            await fetchRechargeRecords(currentUser.uid);
            await fetchPaymentMethodLogos();
        });

        return () => unsubscribe();
    }, [router]);

    const fetchPaymentMethodLogos = async () => {
        try {
            const methodsQuery = query(collection(db, "paymentMethods"));
            const querySnapshot = await getDocs(methodsQuery);
            const logos: Record<string, string> = {};

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.methodName && data.logoUrl) {
                    logos[data.methodName.toLowerCase()] = data.logoUrl;
                }
            });

            setPaymentMethodLogos(logos);
        } catch (error) {
            console.error("Error fetching payment method logos:", error);
        }
    };

    const fetchRechargeRecords = async (userId: string) => {
        try {
            const q = query(
                collection(db, "RechargeReview"),
                where("userId", "==", userId)
            );

            const querySnapshot = await getDocs(q);
            const fetchedRecords: RechargeRecord[] = [];

            querySnapshot.forEach((doc) => {
                fetchedRecords.push({
                    id: doc.id,
                    ...doc.data()
                } as RechargeRecord);
            });

            // Sort by timestamp descending (newest first) on client side
            fetchedRecords.sort((a, b) => {
                const timeA = a.timestamp?.toMillis?.() || 0;
                const timeB = b.timestamp?.toMillis?.() || 0;
                return timeB - timeA;
            });

            setRecords(fetchedRecords);
        } catch (error) {
            console.error("Error fetching recharge records:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "N/A";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const getStatusConfig = (status: string) => {
        switch (status.toLowerCase()) {
            case "verified":
                return {
                    icon: CheckCircle2,
                    color: "emerald",
                    bgColor: "bg-gradient-to-br from-emerald-500 to-emerald-600",
                    lightBg: "bg-emerald-50",
                    textColor: "text-emerald-600",
                    borderColor: "border-emerald-200",
                    label: "Verified",
                    glow: "shadow-emerald-500/20"
                };
            case "under review":
            case "underreview":
            case "review":
                return {
                    icon: Clock,
                    color: "blue",
                    bgColor: "bg-gradient-to-br from-blue-500 to-indigo-600",
                    lightBg: "bg-blue-50",
                    textColor: "text-blue-600",
                    borderColor: "border-blue-200",
                    label: "Under Review",
                    glow: "shadow-blue-500/20"
                };
            default:
                return {
                    icon: Clock,
                    color: "blue",
                    bgColor: "bg-gradient-to-br from-blue-500 to-indigo-600",
                    lightBg: "bg-blue-50",
                    textColor: "text-blue-600",
                    borderColor: "border-blue-200",
                    label: "Under Review",
                    glow: "shadow-blue-500/20"
                };
        }
    };

    const filteredRecords = records.filter(record => {
        if (filter === "all") return true;
        if (filter === "under review") {
            const status = record.status.toLowerCase();
            return status === "under review" || status === "underreview" || status === "review";
        }
        return record.status.toLowerCase() === filter;
    });

    const stats = {
        total: records.length,
        verified: records.filter(r => r.status.toLowerCase() === "verified").length,
        underReview: records.filter(r => {
            const status = r.status.toLowerCase();
            return status === "under review" || status === "underreview" || status === "review";
        }).length,
        totalAmount: records
            .filter(r => r.status.toLowerCase() === "verified")
            .reduce((sum, r) => sum + r.amount, 0)
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                        <Loader2 className="w-16 h-16 text-blue-500 animate-spin relative z-10" />
                    </div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Loading Records...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F0F2F5] font-sans pb-10">
            {/* Minimal Titanium Header */}
            <header className="px-6 pt-8 pb-4 flex items-center gap-4 sticky top-0 bg-[#F0F2F5]/80 backdrop-blur-md z-50 transition-all duration-300">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all active:scale-95"
                >
                    <ChevronLeft size={24} className="text-slate-600" />
                </button>
                <div className="flex-1 text-center pr-10">
                    <h1 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800">Recharge History</h1>
                </div>
            </header>

            <main className="px-5 pt-4 max-w-lg mx-auto w-full">
                {/* Modern Stats Overview */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white rounded-[2rem] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-110 duration-500"></div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Verified</p>
                            <p className="text-2xl font-black text-slate-900 tracking-tight">{stats.totalAmount.toLocaleString()}</p>
                            <div className="flex items-center gap-1 mt-2">
                                <div className="px-2 py-0.5 rounded-md bg-emerald-100/50 border border-emerald-100">
                                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">ETB</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-slate-100 flex items-center justify-between">
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Success</p>
                                <p className="text-lg font-black text-slate-800">{stats.verified}</p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                                <CheckCircle2 size={16} />
                            </div>
                        </div>
                        <div className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-slate-100 flex items-center justify-between">
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pending</p>
                                <p className="text-lg font-black text-slate-800">{stats.underReview}</p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                                <Clock size={16} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filter Tabs - Pill Style */}
                <div className="flex p-1.5 bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 w-full">
                    {[
                        { key: "all", label: "All" },
                        { key: "verified", label: "Success" },
                        { key: "under review", label: "Pending" }
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setFilter(tab.key as any)}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${filter === tab.key
                                ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10"
                                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Records List */}
                <div className="space-y-4 pb-20">
                    {filteredRecords.length === 0 ? (
                        <div className="py-20 text-center opacity-50">
                            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Records Found</p>
                        </div>
                    ) : (
                        filteredRecords.map((record) => {
                            const statusConfig = getStatusConfig(record.status);
                            const StatusIcon = statusConfig.icon;

                            return (
                                <div
                                    key={record.id}
                                    className="bg-white rounded-[2rem] p-5 shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100 relative overflow-hidden group hover:shadow-lg transition-all duration-300"
                                >
                                    {/* Top Row: Icon, Method, Amounts */}
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center p-2.5 shadow-inner">
                                                {paymentMethodLogos[record.paymentMethod.toLowerCase()] ? (
                                                    <img
                                                        src={paymentMethodLogos[record.paymentMethod.toLowerCase()]}
                                                        alt={record.paymentMethod}
                                                        className="w-full h-full object-contain"
                                                    />
                                                ) : (
                                                    <CreditCard className="text-slate-400" size={20} />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-slate-900 capitalize tracking-tight">{record.paymentMethod}</h3>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{formatDate(record.timestamp)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-black text-slate-900 tracking-tight">{record.amount.toLocaleString()}</p>
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${record.status.toLowerCase() === 'verified'
                                                    ? 'bg-emerald-50 text-emerald-600'
                                                    : 'bg-blue-50 text-blue-600'
                                                }`}>
                                                ETB
                                            </span>
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="h-px bg-slate-50 w-full mb-5"></div>

                                    {/* Bottom Details (No FT Code) */}
                                    <div className="flex items-end justify-between">
                                        <div className="space-y-3">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Bank Name</span>
                                                <span className="text-xs font-bold text-slate-700 truncate max-w-[140px]">{record.bankName}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Account Holder</span>
                                                <span className="text-xs font-bold text-slate-700 truncate max-w-[140px]">{record.accountHolderName}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-2">
                                            <div className={`flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-xl border ${record.status.toLowerCase() === 'verified'
                                                    ? 'bg-emerald-50/50 border-emerald-100 text-emerald-600'
                                                    : 'bg-blue-50/50 border-blue-100 text-blue-600'
                                                }`}>
                                                <span className="text-[9px] font-black uppercase tracking-widest">{statusConfig.label}</span>
                                                <StatusIcon size={12} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>
        </div>
    );
}
