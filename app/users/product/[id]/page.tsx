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
        <div className="min-h-screen bg-[#F0F2F5] text-slate-900 pb-32 overflow-hidden relative font-sans">
            {/* Minimal Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-[#F0F2F5]/90 backdrop-blur-md px-6 h-16 flex items-center justify-between max-w-lg mx-auto">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm active:scale-95 transition-transform"
                >
                    <ChevronLeft size={24} />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-lg font-bold text-slate-900">Details</h1>
                    <span className="text-[10px] font-bold text-blue-600 tracking-widest uppercase">Zen Store</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                    <img src="/zen-3d-logo.png" alt="Zen" className="w-6 h-6 object-contain" />
                </div>
            </header>

            <main className="pt-24 px-6 max-w-lg mx-auto space-y-8 relative z-10">
                {/* Product Image */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative"
                >
                    <div className="aspect-[1.3/1] rounded-[2.5rem] overflow-hidden bg-white shadow-xl shadow-slate-200/60 border border-slate-100 relative">
                        {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                                <Award size={64} strokeWidth={1.5} />
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Premium Product</span>
                            </div>
                        )}

                        <div className="absolute top-6 left-6">
                            <span className="px-4 py-1.5 bg-white/90 backdrop-blur-md text-blue-600 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                                {product.category || "General"}
                            </span>
                        </div>
                    </div>
                </motion.div>



                {/* Info Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100"
                >
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Product Data</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Category</span>
                            <span className="text-sm font-bold text-slate-800">{product.category || "Level 1"}</span>
                        </div>
                        <div className="flex items-center justify-between pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Product Name</span>
                            <span className="text-sm font-bold text-slate-800">{product.name}</span>
                        </div>
                        <div className="flex items-center justify-between pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Price</span>
                            <span className="text-sm font-bold text-blue-600">{product.price?.toLocaleString()} ETB</span>
                        </div>
                        <div className="flex items-center justify-between pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Daily Income</span>
                            <span className="text-sm font-bold text-slate-800">{product.dailyIncome?.toLocaleString()} ETB</span>
                        </div>
                        <div className="flex items-center justify-between pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Contract Period</span>
                            <span className="text-sm font-bold text-slate-800">{product.contractPeriod} Days</span>
                        </div>
                        <div className="flex items-center justify-between pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Profit</span>
                            <span className="text-sm font-bold text-emerald-600">{product.totalProfit?.toLocaleString()} ETB</span>
                        </div>
                        <div className="flex items-center justify-between pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Purchase Limit</span>
                            <span className="text-sm font-bold text-slate-800">{product.purchaseLimit || 1} Unit</span>
                        </div>

                    </div>
                </motion.div>

                {/* Status Message Display (Inline) */}
                <AnimatePresence>
                    {statusMsg && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className={`p-4 rounded-2xl flex items-center justify-center gap-3 text-sm font-bold text-center ${statusMsg.type === 'success'
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                : 'bg-red-50 text-red-600 border border-red-100'
                                }`}
                        >
                            {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                            {statusMsg.text === "INSUFFICIENT_FUNDS_SPECIAL" ? "Insufficient Wallet Balance" : statusMsg.text}
                        </motion.div>
                    )}
                </AnimatePresence>

            </main>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-100 z-50 flex flex-col gap-4 max-w-lg mx-auto">
                <button
                    onClick={handlePurchase}
                    disabled={isBuying || (statusMsg?.type === 'success')}
                    className={`w-full h-14 rounded-2xl font-bold text-sm tracking-widest uppercase transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-2 ${isBuying ? "bg-slate-100 text-slate-400" : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                >
                    {isBuying ? (
                        <Loader2 className="animate-spin" size={20} />
                    ) : (
                        <>
                            Buy Now
                        </>
                    )}
                </button>
            </div>
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
