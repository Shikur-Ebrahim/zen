"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
    doc,
    getDoc,
    runTransaction,
    collection,
    serverTimestamp,
    increment,
    setDoc,
    query,
    where,
    getDocs,
    Timestamp
} from "firebase/firestore";
import {
    ChevronLeft,
    Clock,
    TrendingUp,
    ShieldCheck,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Zap,
    Anchor,
    Award,
    X,
    Sparkles,
    ArrowRight,
    Wallet,
    Info,
    History,
    Star
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function UserProductDetailPage() {
    const router = useRouter();
    const { id } = useParams();

    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [isBuying, setIsBuying] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) setUserId(user.uid);
            else setUserId(null);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchProduct = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, "Products", id as string);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setProduct({ id: docSnap.id, ...docSnap.data() });
                }
            } catch (error) {
                console.error("Error fetching product:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id]);

    const handlePurchase = async () => {
        if (!userId) {
            router.push("/");
            return;
        }

        if (isBuying) return;
        setIsBuying(true);
        setStatusMsg(null);

        try {
            await runTransaction(db, async (transaction) => {
                // 1. Get User Data
                const userRef = doc(db, "users", userId);
                const userSnap = await transaction.get(userRef);
                if (!userSnap.exists()) throw new Error("User profile error");

                const userData = userSnap.data();
                const rechargeBalance = Number(userData.Recharge || 0);

                // 2. Validate Funds
                if (rechargeBalance < product.price) {
                    throw new Error("INSUFFICIENT_FUNDS");
                }

                // 3. Purchase Limit Check
                const ordersRef = collection(db, "UserOrders");
                const q = query(ordersRef, where("userId", "==", userId), where("productId", "==", product.id));
                const existingOrdersSnap = await getDocs(q);
                if (existingOrdersSnap.size >= (product.purchaseLimit || 1)) {
                    throw new Error("PURCHASE_LIMIT_REACHED");
                }

                // 4. Record Investment
                const orderRef = doc(collection(db, "UserOrders"));
                transaction.set(orderRef, {
                    userId,
                    productId: product.id,
                    productName: product.name,
                    price: product.price,
                    dailyIncome: product.dailyIncome,
                    contractPeriod: product.contractPeriod,
                    remainingDays: product.contractPeriod,
                    totalProfit: product.totalProfit,
                    principalIncome: product.principalIncome,
                    status: "active",
                    purchaseDate: serverTimestamp(),
                    lastSync: serverTimestamp()
                });

                // 5. Deduct Balance from "Recharge" field and Update Daily Income Rate
                transaction.update(userRef, {
                    Recharge: rechargeBalance - product.price,
                    dailyIncome: increment(product.dailyIncome)
                });
            });

            setStatusMsg({ type: "success", text: "SUCCESS_PARTNER" });
        } catch (error: any) {
            if (!["INSUFFICIENT_FUNDS", "PURCHASE_LIMIT_REACHED", "User profile error"].includes(error.message)) {
                console.error("System Purchase error:", error);
            }
            if (error.message === "INSUFFICIENT_FUNDS") {
                setStatusMsg({ type: "error", text: "INSUFFICIENT_FUNDS_SPECIAL" });

                try {
                    const rechargeReviewRef = collection(db, "RechargeReview");
                    const q = query(
                        rechargeReviewRef,
                        where("userId", "==", userId),
                        where("status", "==", "Under Review")
                    );
                    const snap = await getDocs(q);
                    const targetPath = !snap.empty ? "/users/transaction-pending" : "/users/recharge";
                    setTimeout(() => router.push(targetPath), 3000);
                } catch (queryError) {
                    console.error("Redirection query failed:", queryError);
                    setTimeout(() => router.push("/users/recharge"), 3000);
                }
                return;
            }

            let msg = "Transaction Failed";
            if (error.message === "PURCHASE_LIMIT_REACHED") msg = `Limit reached: ${product.purchaseLimit} items max.`;
            setStatusMsg({ type: "error", text: msg });
        } finally {
            setIsBuying(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6">
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-blue-900 border-t-blue-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 m-auto w-8 h-8 flex items-center justify-center">
                        <Zap className="text-blue-500 animate-pulse" size={24} />
                    </div>
                </div>
                <p className="mt-8 text-blue-500/30 font-black tracking-widest text-[9px] uppercase">Luxury Store Initializing</p>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-8 text-center">
                <div className="w-24 h-24 bg-blue-900/20 rounded-[2.5rem] flex items-center justify-center mb-8 border border-blue-500/20 shadow-sm">
                    <AlertCircle size={48} className="text-blue-500/40" />
                </div>
                <h1 className="text-2xl font-black tracking-tight mb-4 text-white">Product not found</h1>
                <p className="text-blue-400/40 max-w-xs mb-10 text-[10px] font-black tracking-widest uppercase leading-relaxed">The requested item could not be found in our collection.</p>
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.back()}
                    className="px-12 py-5 bg-blue-600 text-white rounded-2xl font-black tracking-widest text-[10px] shadow-lg shadow-blue-500/20"
                >
                    BACK TO CATALOG
                </motion.button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020617] text-white pb-64 overflow-hidden relative">
            {/* Luxury Blue Ambient Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(30,58,138,0.2),transparent_70%)]"></div>
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full translate-x-1/2 translate-y-1/2"></div>
            </div>

            {/* Premium Header - Blue Theme */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-[#020617]/80 backdrop-blur-xl px-6 h-24 flex items-center gap-6 border-b border-blue-500/10 max-w-lg mx-auto shadow-2xl">
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => router.back()}
                    className="w-12 h-12 rounded-full bg-slate-900 border border-blue-400/20 flex items-center justify-center text-blue-400"
                >
                    <ChevronLeft size={24} strokeWidth={2.5} />
                </motion.button>
                <div className="flex flex-col flex-1 truncate">
                    <h1 className="text-xl font-black tracking-tight leading-none text-white">Details</h1>
                    <span className="text-[9px] font-black text-blue-400 tracking-[0.2em] mt-1 uppercase">Zen Store</span>
                </div>
                <div className="w-12 h-12 bg-white/5 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg border border-blue-500/20">
                    <img src="/zen-3d-logo.png" alt="Zen" className="w-7 h-7 object-contain brightness-110" />
                </div>
            </header>

            <main className="pt-32 px-6 max-w-lg mx-auto space-y-10 relative z-10">
                {/* Hero Photo Section */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative group"
                >
                    <div className="aspect-[1.2/1] rounded-[3rem] overflow-hidden bg-slate-900 shadow-2xl border border-blue-500/20 relative group-hover:shadow-blue-500/30 transition-all duration-500">
                        {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 opacity-90 group-hover:opacity-100" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-blue-500/50 gap-6">
                                <Award size={84} strokeWidth={1} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Premium Product</span>
                            </div>
                        )}

                        {/* Floating Identification */}
                        <div className="absolute top-8 left-8">
                            <motion.div
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="px-6 py-2.5 bg-[#020617]/90 backdrop-blur-xl border border-blue-400/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.25em] rounded-2xl shadow-xl flex items-center gap-3"
                            >
                                <ShieldCheck size={14} className="text-blue-400" />
                                {product.category || "LEVEL A"}
                            </motion.div>
                        </div>
                    </div>
                </motion.div>

                {/* About Section - Directly Below Photo */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-6"
                >
                    <header className="flex items-center gap-4 px-2">
                        <h2 className="text-[11px] font-black tracking-[0.3em] text-blue-400/50 uppercase">About</h2>
                        <div className="h-px flex-1 bg-blue-500/10"></div>
                    </header>

                    <div className="bg-blue-900/10 backdrop-blur-md p-8 rounded-[2.5rem] border border-blue-500/10 flex gap-5 items-start">
                        <div className="w-10 h-10 shrink-0 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center text-blue-400">
                            <Info size={18} strokeWidth={2.5} />
                        </div>
                        <p className="text-[13px] text-blue-100/60 font-medium leading-relaxed">
                            This plan helps you earn money every day. Your money is safe in the Zen system. We give you support 24/7.
                        </p>
                    </div>
                </motion.div>

                {/* Details Card Section - Gold Theme */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="space-y-6"
                >
                    <header className="flex items-center gap-4 px-2">
                        <h2 className="text-[11px] font-black tracking-[0.3em] text-[#D4AF37]/60 uppercase">System Spec</h2>
                        <div className="h-px flex-1 bg-[#D4AF37]/10"></div>
                    </header>

                    <div className="bg-[#0A0A0A] p-10 rounded-[2.5rem] border border-[#D4AF37]/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                        {/* Gold Ambient Glow */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/5 rounded-full blur-[100px] -mr-32 -mt-32"></div>

                        <div className="flex items-center gap-3 text-white mb-10">
                            <div className="w-2 h-2 rounded-full bg-[#D4AF37] shadow-[0_0_15px_#D4AF37]"></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#D4AF37]">Execution Details</span>
                        </div>

                        <div className="space-y-6">
                            {[
                                { label: "Purchase Price", value: `${product.price?.toLocaleString()} ETB`, gold: true },
                                { label: "Daily Settlement", value: `${product.dailyIncome?.toLocaleString()} ETB` },
                                { label: "Contract Period", value: `${product.contractPeriod} Days` },
                                { label: "Daily Growth Rate", value: `${product.dailyRate}%` },
                                { label: "Total Yield", value: `${product.totalProfit?.toLocaleString()} ETB`, highlight: true },
                                { label: "Unit Limit", value: `${product.purchaseLimit || 1} UNIT` }
                            ].map((spec, i) => (
                                <div key={i} className="flex items-center justify-between py-4 border-b border-white/5 last:border-0 group/item">
                                    <span className="text-[10px] font-black text-[#D4AF37]/40 uppercase tracking-[0.2em] group-hover/item:text-[#D4AF37]/60 transition-colors uppercase">{spec.label}</span>
                                    <span className={`text-[13px] font-black tracking-widest uppercase ${spec.gold ? "text-[#D4AF37]" : spec.highlight ? "text-white" : "text-white/60"}`}>
                                        {spec.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </main>

            {/* Premium Interaction Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-8 pt-12 pb-10 bg-gradient-to-t from-[#020617] via-[#020617]/95 to-transparent z-[150] flex flex-col items-center gap-6">
                <div className="w-full max-w-lg">
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowConfirmModal(true)}
                        disabled={isBuying}
                        className={`w-full h-20 rounded-[2.5rem] font-black text-[14px] tracking-[0.4em] transition-all flex items-center justify-center group shadow-2xl ${isBuying
                            ? "bg-slate-800 text-blue-500/40"
                            : "bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-500 hover:shadow-blue-500/40"
                            }`}
                    >
                        {isBuying ? (
                            <Loader2 className="animate-spin text-blue-400" size={28} />
                        ) : (
                            <span className="uppercase tracking-[0.4em]">BUY</span>
                        )}
                    </motion.button>
                </div>
            </div>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {showConfirmModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-end justify-center p-0"
                    >
                        <div
                            className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm"
                            onClick={() => setShowConfirmModal(false)}
                        ></div>

                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="relative w-full max-w-lg bg-[#0F172A] rounded-t-[3.5rem] shadow-[0_-20px_60px_rgba(0,0,0,0.5)] p-10 space-y-10 border-t border-blue-500/20 overflow-hidden"
                        >
                            <header className="flex items-center justify-between relative z-10 px-2">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Order Info</h2>
                                    <div className="w-12 h-1.5 bg-blue-500 rounded-full shadow-[0_2px_15px_rgba(59,130,246,0.5)]"></div>
                                </div>
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setShowConfirmModal(false)}
                                    className="w-12 h-12 rounded-full bg-slate-800 border border-blue-500/10 flex items-center justify-center text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    <X size={24} />
                                </motion.button>
                            </header>

                            <div className="relative min-h-[360px] flex flex-col justify-center">
                                {statusMsg ? (
                                    <motion.div
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="space-y-8"
                                    >
                                        {statusMsg.text !== "INSUFFICIENT_FUNDS_SPECIAL" && statusMsg.text !== "SUCCESS_PARTNER" && (
                                            <div className={`p-10 rounded-[2.5rem] flex flex-col items-center gap-6 text-center border shadow-xl ${statusMsg.type === 'success'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                }`}>
                                                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center ${statusMsg.type === 'success' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                                                    {statusMsg.type === 'success' ? <CheckCircle2 size={32} className="text-emerald-400" /> : <AlertCircle size={32} className="text-red-400" />}
                                                </div>
                                                <span className="text-[12px] font-black uppercase tracking-widest leading-relaxed">{statusMsg.text}</span>
                                            </div>
                                        )}
                                    </motion.div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="bg-[#0A0A0A] rounded-[2.5rem] p-8 border border-[#D4AF37]/20 space-y-6 relative overflow-hidden group">
                                            <div className="absolute bottom-0 right-0 w-40 h-40 bg-[#D4AF37]/5 rounded-full blur-3xl -mr-20 -mb-20"></div>

                                            {[
                                                { label: "Product Name", value: product.name },
                                                { label: "Execution Price", value: `${product.price?.toLocaleString()} ETB`, gold: true },
                                                { label: "Settlement Period", value: `${product.contractPeriod} Days` },
                                            ].map((item, idx) => (
                                                <div key={idx} className="flex items-center justify-between pb-6 border-b border-white/5 last:border-0 last:pb-0 relative z-10">
                                                    <span className="text-[9px] font-black text-[#D4AF37]/30 uppercase tracking-[0.3em]">{item.label}</span>
                                                    <span className={`text-[14px] font-black tracking-widest uppercase ${item.gold ? "text-[#D4AF37]" : "text-white"}`}>{item.value}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex justify-between items-center px-8">
                                            <span className="text-[10px] font-black tracking-[0.5em] text-[#D4AF37]/30 uppercase">Total Committal</span>
                                            <span className="text-3xl font-black tracking-tighter text-white">
                                                {product.price?.toLocaleString()} <span className="text-[10px] text-[#D4AF37] ml-1">ETB</span>
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {!statusMsg && (
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handlePurchase}
                                    disabled={isBuying}
                                    className="w-full h-22 bg-blue-600 text-white rounded-[2.5rem] font-black text-[14px] tracking-[0.3em] shadow-[0_15px_30px_rgba(37,99,235,0.3)] transition-all flex items-center justify-center gap-4 relative overflow-hidden group"
                                >
                                    {isBuying ? (
                                        <Loader2 className="animate-spin" size={24} />
                                    ) : (
                                        <>
                                            <span className="relative z-10 ml-2">BUY</span>
                                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all">
                                                <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </>
                                    )}
                                </motion.button>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Add local animation for progress bar
const style = `
@keyframes progress-shrink {
    0% { transform: scaleX(1); }
    100% { transform: scaleX(0); }
}
.animate-progress-shrink {
    animation: progress-shrink 3s linear forwards;
}
`;

if (typeof document !== 'undefined') {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = style;
    document.head.appendChild(styleSheet);
}
