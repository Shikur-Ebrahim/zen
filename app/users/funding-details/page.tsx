"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
    ChevronLeft,
    Loader2,
    Package,
    Calendar,
    Timer,
    Zap,
    Coins,
    TrendingUp,
    LayoutGrid,
    Clock,
    CheckCircle2
} from "lucide-react";

export default function FundingDetailsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<any[]>([]);
    const [products, setProducts] = useState<Record<string, any>>({});
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                router.push("/");
                return;
            }
            setUserId(currentUser.uid);

            // Fetch User Orders
            const qOrders = query(
                collection(db, "UserOrders"),
                where("userId", "==", currentUser.uid)
            );

            const unsubscribeDocs = onSnapshot(qOrders, async (snapshot) => {
                const ordersData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as any[];

                // Fetch unique product details for images
                const productIds = Array.from(new Set(ordersData.map(o => o.productId)));
                const productMap: Record<string, any> = { ...products };

                for (const pid of productIds) {
                    if (!productMap[pid]) {
                        const pDoc = await getDoc(doc(db, "Products", pid));
                        if (pDoc.exists()) {
                            productMap[pid] = pDoc.data();
                        }
                    }
                }

                setProducts(productMap);
                setOrders(ordersData);
                setLoading(false);
            });

            return () => unsubscribeDocs();
        });

        return () => unsubscribeAuth();
    }, [router]);

    const formatDate = (dateValue: any) => {
        if (!dateValue) return "N/A";
        const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
        if (isNaN(date.getTime())) return "N/A";

        return new Intl.DateTimeFormat('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }).format(date);
    };

    const calculateRemainingDays = (order: any) => {
        if (order.remainingDays !== undefined) return order.remainingDays;

        // Fallback calculation if not synced
        const dateValue = order.purchaseDate || order.createdAt;
        const purchaseDate = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue);
        if (isNaN(purchaseDate.getTime())) return 0;

        const now = new Date();
        const diffDays = Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
        const remaining = (order.contractPeriod || 0) - diffDays;
        return remaining > 0 ? remaining : 0;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-20 font-sans">
            {/* Header */}
            <header className="px-6 py-4 flex items-center justify-between sticky top-0 z-50 bg-[#F8FAFC]/90 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm active:scale-95 transition-all"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <h1 className="text-lg font-bold text-slate-800">My Assets</h1>
                </div>
            </header>

            <main className="px-6 space-y-6 mt-2">
                {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                            <Package size={32} className="text-slate-400" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-slate-700">No Active Plans</h3>
                            <p className="text-sm text-slate-500">You haven't invested in any products yet.</p>
                        </div>
                        <button
                            onClick={() => router.push('/users/product')}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 transition-all"
                        >
                            Browse Products
                        </button>
                    </div>
                ) : (
                    orders.map((order) => {
                        const product = products[order.productId] || {};
                        const remaining = calculateRemainingDays(order);
                        const progress = ((order.contractPeriod - remaining) / order.contractPeriod) * 100;
                        const totalProfit = (order.dailyIncome || 0) * (order.contractPeriod - remaining);

                        return (
                            <div
                                key={order.id}
                                className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100 flex flex-col gap-5"
                            >
                                {/* Top Section: Image & Title */}
                                <div className="flex gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0">
                                        {product.imageUrl ? (
                                            <img src={product.imageUrl} alt={order.productName} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Package size={20} className="text-slate-300" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="text-base font-bold text-slate-800 truncate pr-2">{order.productName}</h3>
                                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full border border-emerald-100">
                                                Active
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                                            <Clock size={12} />
                                            <span>Purchased {formatDate(order.purchaseDate || order.createdAt)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="h-px w-full bg-slate-50"></div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                                            <Coins size={12} /> Principal
                                        </span>
                                        <p className="text-sm font-bold text-slate-800">
                                            {Number(order.price).toLocaleString()} <span className="text-xs text-slate-400 font-normal">ETB</span>
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                                            <TrendingUp size={12} /> Daily
                                        </span>
                                        <p className="text-sm font-bold text-slate-800">
                                            {Number(order.dailyIncome).toLocaleString()} <span className="text-xs text-slate-400 font-normal">ETB</span>
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                                            <Zap size={12} /> Total Earned
                                        </span>
                                        <p className="text-sm font-bold text-emerald-600">
                                            +{totalProfit.toLocaleString()} <span className="text-xs text-slate-400 font-normal">ETB</span>
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                                            <Timer size={12} /> Remaining
                                        </span>
                                        <p className="text-sm font-bold text-blue-600">
                                            {remaining} <span className="text-xs text-slate-400 font-normal">Days</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-medium text-slate-400">Plan Progress</span>
                                        <span className="font-bold text-blue-600">{Math.round(progress)}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                                            style={{ width: `${Math.min(100, progress)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </main>
        </div>
    );
}
