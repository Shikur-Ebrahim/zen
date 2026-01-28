"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, orderBy, onSnapshot, where, getDocs, limit, deleteDoc, writeBatch, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import {
    Home,
    Wallet,
    Ship,
    Users,
    Bell,
    TrendingUp,
    Loader2,
    Shield,
    Package,
    CheckCircle2,
    Coins,
    Star,
    PartyPopper,
    ArrowLeftRight
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import VipCelebrationCard from "@/components/VipCelebrationCard";
import { motion, AnimatePresence } from "framer-motion";

import { Suspense } from "react";

function WelcomeContent() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeNav, setActiveNav] = useState("home");
    const [banners, setBanners] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
    const [isResetting, setIsResetting] = useState(false);
    const [mounted, setMounted] = useState(false);


    // Notification State
    const [userNotifs, setUserNotifs] = useState<any[]>([]);
    const [latestRecharge, setLatestRecharge] = useState<any>(null);
    const [showNotifPanel, setShowNotifPanel] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // VIP Celebration State
    const [showVipCeleb, setShowVipCeleb] = useState(false);
    const [vipCelebData, setVipCelebData] = useState<any>(null);

    const searchParams = useSearchParams();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        const tab = searchParams.get('tab');
        if (tab && ['home', 'product', 'team', 'wallet'].includes(tab)) {
            setActiveNav(tab);
        } else {
            setActiveNav('home');
        }
    }, [searchParams]);

    useEffect(() => {
        if (!user) return;

        // 1. Listen for User's Latest Recharge
        const qRecharge = query(
            collection(db, "RechargeReview"),
            where("userId", "==", user.uid)
        );

        const unsubscribeRec = onSnapshot(qRecharge, (snapshot) => {
            if (!snapshot.empty) {
                const recharges = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Client-side sort to avoid index issues
                recharges.sort((a: any, b: any) => {
                    const timeA = a.timestamp?.toMillis?.() || 0;
                    const timeB = b.timestamp?.toMillis?.() || 0;
                    return timeB - timeA;
                });

                const latest = recharges[0] as any;
                setLatestRecharge(latest);
                // Only trigger dot for 'Under Review' recharges
                if (latest.status === 'Under Review') {
                    setHasUnread(true);
                }
            }
        });

        // 2. Listen for User-Specific Reward Notifications
        const qUserNotifs = query(
            collection(db, "UserNotifications"),
            where("userId", "==", user.uid)
        );

        const unsubscribeNotifs = onSnapshot(qUserNotifs, async (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            // Client-side sort to avoid index requirements
            notifs.sort((a: any, b: any) => {
                const timeA = a.createdAt?.toMillis?.() || 0;
                const timeB = b.createdAt?.toMillis?.() || 0;
                return timeB - timeA;
            });

            // Limit to top 25 most recent for display
            const limitedNotifs = notifs.slice(0, 25);

            setUserNotifs(limitedNotifs);

            // Sync unread dot with actual unread notifications
            const unreadNotifs = limitedNotifs.filter((n: any) => !n.read);
            const hasAnyUnread = unreadNotifs.length > 0;
            if (hasAnyUnread) {
                setHasUnread(true);
                setUnreadCount(unreadNotifs.length);
            } else {
                setUnreadCount(0);
            }

            // --- Auto-Cleanup Logic ---
            // If total notifications exceed 25, delete the older ones from the database
            if (notifs.length > 25) {
                const toDelete = notifs.slice(25);
                const batch = writeBatch(db);
                toDelete.forEach((notif) => {
                    const docRef = doc(db, "UserNotifications", notif.id);
                    batch.delete(docRef);
                });
                try {
                    await batch.commit();
                } catch (error) {
                    console.error("Error cleaning up old notifications:", error);
                }
            }
        });

        return () => {
            unsubscribeRec();
            unsubscribeNotifs();
        };
    }, [user]);

    const handleMarkAsRead = async (notif: any) => {
        if (notif.read === false) {
            try {
                const docRef = doc(db, "UserNotifications", notif.id);
                await updateDoc(docRef, { read: true });
            } catch (error) {
                console.error("Error marking as read:", error);
            }
        }
    };

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push("/");
                return;
            }
            setUser(currentUser);

            try {
                const docRef = doc(db, "users", currentUser.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setUserData(data);

                    // --- VIP Celebration Logic ---
                    const currentVip = data.vip || 0;
                    const vipViews = data.vipViews || {};
                    const currentViews = vipViews[`level_${currentVip}`] || 0;

                    if (currentVip > 0 && currentViews < 3) {
                        const notifDoc = await getDoc(doc(db, "VipNotifications", `vip_${currentVip}`));
                        if (notifDoc.exists()) {
                            setVipCelebData({ ...notifDoc.data(), currentViews });
                            setShowVipCeleb(true);
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setLoading(false);
            }
        });

        // Fetch banners and notifications once
        const qBanners = query(collection(db, "banners"), orderBy("createdAt", "desc"));
        const unsubscribeBanners = onSnapshot(qBanners, (snapshot) => {
            const bannerData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBanners(bannerData);
        });

        const qNotifs = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
        const unsubscribeNotifs = onSnapshot(qNotifs, (snapshot) => {
            const notifData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setNotifications(notifData);
        });

        // 3. Fetch all products sorted by price ascending (smaller price at top)
        const qProducts = query(collection(db, "Products"), orderBy("price", "asc"));
        const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
            const productData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Client-side sort to ensure correct order
            productData.sort((a: any, b: any) => (a.price || 0) - (b.price || 0));
            setProducts(productData);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeBanners();
            unsubscribeNotifs();
            unsubscribeProducts();
        };
    }, [router]);

    // Separate effect for banner interval to avoid redundant subscriptions
    useEffect(() => {
        if (banners.length <= 1) return;

        // Synchronize initial banner with the current hour
        const hourIndex = Math.floor(Date.now() / 3600000) % banners.length;
        setCurrentBannerIndex(hourIndex);

        const bannerInterval = setInterval(() => {
            setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
        }, 3600000); // 1 hour interval

        return () => clearInterval(bannerInterval);
    }, [banners.length]);

    const handleLogout = async () => {
        await signOut(auth);
        router.push("/");
    };

    const handleRechargeClick = async () => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                router.push("/users/recharge");
                return;
            }

            // Check for pending recharge
            const q = query(
                collection(db, "RechargeReview"),
                where("userId", "==", currentUser.uid),
                where("status", "==", "Under Review"),
                limit(1)
            );

            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const pendingData = querySnapshot.docs[0].data();
                const theme = pendingData.paymentMethod || "regular";
                router.push(`/users/transaction-pending?theme=${theme}`);
            } else {
                router.push("/users/recharge");
            }
        } catch (error) {
            console.error("Error checking pending status:", error);
            router.push("/users/recharge");
        }
    };

    if (!mounted || loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#7B3F00]">
                <Loader2 className="w-12 h-12 animate-spin text-[#F5E6D3]" />
                <p className="mt-8 text-sm font-medium tracking-wide text-[#F5E6D3]/60">Loading...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#7B3F00] text-[#F5E6D3] pb-32 relative overflow-hidden" onClick={() => showNotifPanel && setShowNotifPanel(false)}>
            {/* Ambient Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#F5E6D3]/5 blur-[120px] rounded-full"></div>
            </div>

            {/* Premium Top Bar */}
            <header className="fixed top-0 left-0 right-0 bg-[#7B3F00]/95 backdrop-blur-3xl z-40 px-4 py-4 flex items-center justify-between border-b border-[#F5E6D3]/10">
                <div className="flex items-center gap-3">
                    <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="w-10 h-10 relative rounded-full overflow-hidden border border-[#F5E6D3]/20"
                    >
                        <img src="/zen-3d-logo.png" alt="Zen Logo" className="w-full h-full object-cover" />
                    </motion.div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-medium text-[#F5E6D3]/40 uppercase tracking-wider">Account</span>
                        <span className="text-sm font-bold text-[#F5E6D3]">
                            {userData?.email?.split('@')[0] || "User"}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => {
                                setShowNotifPanel(!showNotifPanel);
                                setHasUnread(false);
                            }}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1A0F00]/40 relative border border-[#F5E6D3]/10 hover:bg-[#1A0F00]/60 transition-all active:scale-95"
                        >
                            <Bell size={20} className="text-[#F5E6D3]" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-4.5 px-1 flex items-center justify-center bg-[#D4AF37] text-black text-[9px] font-bold rounded-full border-2 border-[#7B3F00]">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {showNotifPanel && (
                            <div className="absolute top-full right-0 mt-4 w-72 bg-[#1A0F00] rounded-2xl shadow-xl border border-[#F5E6D3]/10 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="p-3 flex items-center justify-between border-b border-[#F5E6D3]/5 mb-2">
                                    <h4 className="text-xs font-bold text-[#F5E6D3]">Notifications</h4>
                                    <span className="text-[9px] bg-[#D4AF37]/10 px-2 py-0.5 rounded-full font-bold text-[#D4AF37]">New</span>
                                </div>
                                <div className="max-h-80 overflow-y-auto p-1 space-y-2">
                                    {(() => {
                                        const allNotifs: any[] = [...userNotifs];
                                        if (latestRecharge) allNotifs.push({ ...latestRecharge, type: 'recharge' });
                                        allNotifs.sort((a, b) => ((b.createdAt || b.timestamp)?.toMillis?.() || 0) - ((a.createdAt || a.timestamp)?.toMillis?.() || 0));

                                        if (allNotifs.length === 0) return (
                                            <div className="py-12 text-center text-[#F5E6D3]/20 text-xs font-medium">No notifications</div>
                                        );

                                        return allNotifs.map((notif, idx) => {
                                            const isUnread = notif.read === false;
                                            const LEVEL_MAP: Record<string, string> = {
                                                "Level A": "1", "Level 1": "1", "Level B": "2", "Level 2": "2",
                                                "Level C": "3", "Level 3": "3", "Level D": "4", "Level 4": "4"
                                            };

                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => handleMarkAsRead(notif)}
                                                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${isUnread ? "bg-[#D4AF37]/5 border-[#D4AF37]/10" : "bg-[#F5E6D3]/5 border-transparent hover:bg-[#F5E6D3]/10"}`}
                                                >
                                                    <div className="w-10 h-10 rounded-lg bg-black shrink-0 flex items-center justify-center overflow-hidden">
                                                        <img
                                                            src={notif.type === 'registration' ? encodeURI(`/level ${LEVEL_MAP[notif.level as string] || "1"}.jpg`) : "/zen-3d-logo.png"}
                                                            className="w-full h-full object-cover"
                                                            alt="Notif"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-xs font-bold text-[#F5E6D3] line-clamp-1">{notif.message || notif.type.replace('_', ' ')}</p>
                                                        <p className="text-[10px] text-[#F5E6D3]/40 font-medium mt-0.5">{notif.amount ? `${Number(notif.amount).toLocaleString()} ETB` : "Success"}</p>
                                                    </div>
                                                    {isUnread && <div className="w-2 h-2 bg-[#D4AF37] rounded-full"></div>}
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="pt-20 space-y-8 max-w-lg mx-auto pb-20 relative z-10">
                {activeNav === "home" ? (
                    <>
                        {/* Elite Banner Section - Premium Horizontal Slider Redesign */}
                        {banners.length > 0 && (
                            <section className="relative">
                                <div className="w-full aspect-[2/1] overflow-hidden bg-[#1A0F00] relative shadow-lg border-b border-[#F5E6D3]/5">
                                    <div
                                        className="flex h-full"
                                        style={{
                                            width: `${(banners.length + 1) * 100}%`,
                                            transform: `translateX(-${(currentBannerIndex * 100) / (banners.length + 1)}%)`,
                                            transition: isResetting ? 'none' : 'transform 1s cubic-bezier(0.2, 1, 0.3, 1)'
                                        }}
                                        onTransitionEnd={() => {
                                            if (currentBannerIndex >= banners.length) {
                                                setIsResetting(true);
                                                setCurrentBannerIndex(0);
                                                setTimeout(() => setIsResetting(false), 50);
                                            }
                                        }}
                                    >
                                        {[...banners, banners[0]].map((banner, index) => (
                                            <div key={index} className="w-full h-full relative" style={{ width: `${100 / (banners.length + 1)}%` }}>
                                                <img src={banner?.url} alt="ZEN Collection" className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Black Wavy Overlay */}
                                    <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none pointer-events-none">
                                        <svg className="relative block w-full h-[30px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                                            <path d="M0,0 C150,80 350,80 600,40 C850,0 1050,0 1200,40 L1200,120 L0,120 Z" fill="#000000"></path>
                                        </svg>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Content Wrap with original padding */}
                        <div className="px-6 space-y-4">


                            {/* Quick Actions Grid */}
                            <section className="space-y-6 pt-4">
                                <div className="flex items-center justify-between gap-3 px-1">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-xs font-bold text-[#F5E6D3]/40 uppercase tracking-widest">Wallets</h3>
                                        <div className="w-12 h-px bg-[#F5E6D3]/5"></div>
                                    </div>
                                    <div className="flex items-baseline gap-1.5 bg-[#F5E6D3]/5 px-3 py-1.5 rounded-lg border border-[#F5E6D3]/5">
                                        <span className="text-[10px] font-bold text-[#F5E6D3]/40 uppercase tracking-wider">Balance</span>
                                        <span className="text-sm font-bold text-[#F5E6D3]">
                                            {(userData?.balance ?? userData?.Recharge ?? 0).toLocaleString()} <span className="text-[10px] font-medium text-[#F5E6D3]/60">ETB</span>
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Action: Add Money */}
                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleRechargeClick}
                                        className="bg-[#F5F5F5] rounded-[2.5rem] p-6 flex flex-col items-start gap-4 border border-white shadow-[0_10px_40px_rgba(0,0,0,0.2)] transition-all hover:translate-y-[-2px] active:scale-95"
                                    >
                                        <div className="w-14 h-14 rounded-2xl bg-[#7B3F00]/5 flex items-center justify-center text-[#7B3F00] shadow-sm border border-[#7B3F00]/5">
                                            <Wallet size={28} />
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Account</span>
                                            <span className="text-xl font-bold text-gray-900 tracking-tight leading-none">Deposit</span>
                                        </div>
                                    </motion.button>

                                    {/* Action: Withdraw */}
                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => router.push("/users/withdraw")}
                                        className="bg-[#F5F5F5] rounded-[2.5rem] p-6 flex flex-col items-start gap-4 border border-white shadow-[0_10px_40px_rgba(0,0,0,0.2)] transition-all hover:translate-y-[-2px] active:scale-95"
                                    >
                                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-500/10">
                                            <Coins size={28} />
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Payout</span>
                                            <span className="text-xl font-bold text-gray-900 tracking-tight leading-none">Withdraw</span>
                                        </div>
                                    </motion.button>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    {/* Action: Invite */}
                                    <motion.button
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => router.push("/users/invite")}
                                        className="bg-[#F5F5F5] rounded-[2rem] p-4 flex flex-col items-center justify-center gap-3 border border-white shadow-lg transition-all hover:translate-y-[-2px] active:scale-95"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-orange-500/5 flex items-center justify-center text-orange-600">
                                            <Users size={24} />
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Invite</span>
                                    </motion.button>

                                    {/* Action: Rules */}
                                    <motion.button
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => router.push("/users/vip-rules")}
                                        className="bg-[#F5F5F5] rounded-[2rem] p-4 flex flex-col items-center justify-center gap-3 border border-white shadow-lg transition-all hover:translate-y-[-2px] active:scale-95"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-blue-500/5 flex items-center justify-center text-blue-600">
                                            <Shield size={24} />
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">VIP</span>
                                    </motion.button>

                                    {/* Action: Exchange */}
                                    <motion.button
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => router.push("/users/exchange")}
                                        className="bg-[#F5F5F5] rounded-[2rem] p-4 flex flex-col items-center justify-center gap-3 border border-white shadow-lg transition-all hover:translate-y-[-2px] active:scale-95"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-blue-500/5 flex items-center justify-center text-blue-600">
                                            <ArrowLeftRight size={24} />
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Exchange</span>
                                    </motion.button>
                                </div>
                            </section>

                            {/* Products Section */}
                            <div className="space-y-6 pt-4 pb-12">
                                <div className="flex items-center gap-3 px-1">
                                    <h3 className="text-xs font-bold text-[#F5E6D3]/40 uppercase tracking-widest">Products</h3>
                                    <div className="flex-1 h-px bg-[#F5E6D3]/5"></div>
                                </div>

                                <div className="space-y-6">
                                    {products.map((product) => (
                                        <motion.div
                                            key={product.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            onClick={() => router.push(`/users/product/${product.id}`)}
                                            className="bg-[#1A0F00]/40 rounded-3xl p-6 shadow-xl border border-[#F5E6D3]/10 active:scale-[0.99] transition-all cursor-pointer"
                                        >
                                            {/* Product Image */}
                                            <div className="aspect-[2/1] w-full rounded-2xl overflow-hidden bg-black relative mb-6 border border-[#F5E6D3]/5">
                                                {product.imageUrl ? (
                                                    <img
                                                        src={product.imageUrl}
                                                        alt={product.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[#F5E6D3]/10">
                                                        <Package size={48} />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="text-xl font-bold text-[#F5E6D3] tracking-tight">{product.name}</h3>
                                                        <p className="text-xs font-medium text-[#F5E6D3]/30 mt-1">Product</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[10px] font-bold text-[#F5E6D3]/30 uppercase block mb-1">Price</span>
                                                        <span className="text-xl font-bold text-[#D4AF37]">
                                                            {product.price?.toLocaleString()}
                                                            <span className="text-xs ml-1 font-medium text-[#D4AF37]/60">ETB</span>
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="bg-[#1A0F00]/60 rounded-2xl p-4 border border-[#F5E6D3]/5">
                                                        <span className="text-[10px] font-bold text-[#F5E6D3]/20 uppercase block mb-1">Daily Profit</span>
                                                        <p className="text-base font-bold text-[#F5E6D3]">
                                                            {product.dailyIncome?.toLocaleString()}
                                                            <span className="text-xs ml-1 font-medium text-[#F5E6D3]/40">ETB</span>
                                                        </p>
                                                    </div>
                                                    <div className="bg-[#1A0F00]/60 rounded-2xl p-4 border border-[#F5E6D3]/5">
                                                        <span className="text-[10px] font-bold text-[#F5E6D3]/20 uppercase block mb-1">Term</span>
                                                        <p className="text-base font-bold text-[#F5E6D3]">
                                                            {product.contractPeriod}
                                                            <span className="text-xs ml-1 font-medium text-[#F5E6D3]/40">Days</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                <button className="w-full h-12 bg-[#D4AF37] rounded-xl flex items-center justify-center shadow-lg shadow-[#D4AF37]/10 text-black text-sm font-bold transition-all hover:bg-[#F5E6D3]">
                                                    Buy Now
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-700">
                        <Loader2 size={32} className="animate-spin opacity-20" />
                        <p className="mt-4 text-[10px] font-black uppercase tracking-widest">Loading...</p>
                    </div>
                )}
            </main>

            {/* VIP Celebration Overlay */}
            {
                showVipCeleb && vipCelebData && (
                    <VipCelebrationCard
                        vipLevel={vipCelebData.vipLevel}
                        text={vipCelebData.text}
                        imageUrl={vipCelebData.imageUrl}
                        onClose={async () => {
                            setShowVipCeleb(false);
                            if (user) {
                                try {
                                    await updateDoc(doc(db, "users", user.uid), {
                                        [`vipViews.level_${vipCelebData.vipLevel}`]: (vipCelebData.currentViews || 0) + 1
                                    });
                                } catch (err) { console.error(err); }
                            }
                        }}
                    />
                )
            }
        </div >
    );
}

export default function WelcomePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#7B3F00]">
                <Loader2 className="w-10 h-10 animate-spin text-[#F5E6D3]" />
            </div>
        }>
            <WelcomeContent />
        </Suspense>
    );
}
