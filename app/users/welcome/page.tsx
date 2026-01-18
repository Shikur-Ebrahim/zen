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
    PartyPopper
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
            const hasAnyUnread = limitedNotifs.some((n: any) => !n.read);
            if (hasAnyUnread) {
                setHasUnread(true);
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

        // 3. Fetch all products
        const qProducts = query(collection(db, "Products"), orderBy("createdAt", "desc"));
        const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
            const productData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

        const bannerInterval = setInterval(() => {
            setCurrentBannerIndex((prev) => prev + 1);
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
            <div className="min-h-screen flex items-center justify-center bg-[#7B3F00]">
                <Loader2 className="w-10 h-10 animate-spin text-[#F5E6D3]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#7B3F00] text-[#F5E6D3] pb-44 relative overflow-hidden" onClick={() => showNotifPanel && setShowNotifPanel(false)}>
            {/* Ambient Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#F5E6D3]/5 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#1A0F00]/40 blur-[100px] rounded-full"></div>
            </div>

            {/* Premium Top Bar */}
            <header className="fixed top-0 left-0 right-0 bg-[#7B3F00]/95 backdrop-blur-3xl z-40 px-6 py-5 flex items-center justify-between border-b border-[#F5E6D3]/10 shadow-lg">
                <div className="flex items-center gap-4">
                    <motion.div
                        initial={{ rotate: -10, scale: 0.9 }}
                        animate={{ rotate: 0, scale: 1 }}
                        className="w-12 h-12 relative rounded-full overflow-hidden border border-[#F5E6D3]/20 shadow-lg"
                    >
                        <img src="/zen-3d-logo.png" alt="Zen Logo" className="w-full h-full object-cover" />
                    </motion.div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-[#F5E6D3]/60 uppercase tracking-widest leading-none mb-1">Account</span>
                        <span className="text-sm font-black text-[#F5E6D3] tracking-tight">
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
                            className="w-11 h-11 flex items-center justify-center rounded-2xl bg-[#F5E6D3]/10 border border-[#F5E6D3]/20 relative hover:bg-[#F5E6D3]/20 transition-all active:scale-95"
                        >
                            <Bell size={20} className="text-[#F5E6D3]" />
                            {hasUnread && (
                                <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-[#F5E6D3] border-2 border-[#7B3F00] rounded-full"></span>
                            )}
                        </button>

                        {showNotifPanel && (
                            <div className="absolute top-full right-0 mt-4 w-85 bg-[#7B3F00] rounded-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] border border-[#F5E6D3]/10 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden">
                                <div className="p-4 flex items-center justify-between">
                                    <h4 className="text-[10px] font-black text-[#F5E6D3]/60 uppercase tracking-[0.2em]">Live Updates</h4>
                                    <span className="text-[9px] bg-[#F5E6D3]/20 px-2 py-0.5 rounded-full font-bold text-[#F5E6D3]">LIVE</span>
                                </div>
                                <div className="max-h-[420px] overflow-y-auto p-2 space-y-2 scrollbar-hide">
                                    {(() => {
                                        const allNotifs: any[] = [...userNotifs];
                                        if (latestRecharge) allNotifs.push({ ...latestRecharge, type: 'recharge' });
                                        allNotifs.sort((a, b) => ((b.createdAt || b.timestamp)?.toMillis?.() || 0) - ((a.createdAt || a.timestamp)?.toMillis?.() || 0));

                                        if (allNotifs.length === 0) return (
                                            <div className="py-12 text-center text-slate-600/40 text-[10px] uppercase font-black tracking-widest">No news</div>
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
                                                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${isUnread ? "bg-[#F5E6D3]/10 border-[#F5E6D3]/20 scale-[1.02]" : "bg-transparent border-transparent hover:bg-[#F5E6D3]/5"}`}
                                                >
                                                    <div className="w-10 h-10 rounded-full bg-black/40 shrink-0 flex items-center justify-center overflow-hidden border border-[#F5E6D3]/10 shadow-sm">
                                                        <img
                                                            src={notif.type === 'registration' ? encodeURI(`/level ${LEVEL_MAP[notif.level as string] || "1"}.jpg`) : "/zen-3d-logo.png"}
                                                            className="w-full h-full object-cover"
                                                            alt="Notif"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-[11px] font-black text-[#F5E6D3] line-clamp-1 uppercase tracking-tight">{notif.message || notif.type.replace('_', ' ')}</p>
                                                        <p className="text-[10px] text-[#F5E6D3]/60 font-bold mt-0.5">{notif.amount ? `${Number(notif.amount).toLocaleString()} ETB` : "Success"}</p>
                                                    </div>
                                                    {isUnread && <div className="w-2 h-2 bg-[#F5E6D3] rounded-full shadow-lg shadow-[#F5E6D3]/50"></div>}
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

            <main className="pt-24 space-y-8 max-w-lg mx-auto pb-20 relative z-10">
                {activeNav === "home" ? (
                    <>
                        {/* Elite Banner Section - Vertical Slider Redesign */}
                        {banners.length > 0 && (
                            <section className="relative">
                                <div className="w-full aspect-[1.3/1] rounded-b-[3.5rem] overflow-hidden shadow-2xl shadow-black/40 bg-[#7B3F00] relative">
                                    <div
                                        className="flex flex-col h-full"
                                        style={{
                                            transform: `translateY(-${currentBannerIndex * 100}%)`,
                                            transition: isResetting ? 'none' : 'transform 0.9s cubic-bezier(0.23, 1, 0.32, 1)'
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
                                            <div key={index} className="w-full min-h-full relative">
                                                <img src={banner?.url} alt="ZEN Collection" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Content Wrap with original padding */}
                        <div className="px-6 space-y-8">
                            {/* Marquee - Optimized for luxury feel */}
                            {notifications.length > 0 && (
                                <div className="bg-white/5 backdrop-blur-md rounded-2xl py-3 border border-white/10 overflow-hidden relative">
                                    <div className="flex marquee-container gap-12 whitespace-nowrap animate-horizontal-scroll px-4">
                                        {[...notifications, ...notifications].map((notif, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <div className="w-1 h-1 bg-[#F5E6D3] rounded-full"></div>
                                                <span className="text-[10px] font-black text-[#F5E6D3]/70 uppercase tracking-widest">{notif.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Interactive Action Grid */}
                            <section className="space-y-6 pt-2">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-[11px] font-black text-[#F5E6D3] uppercase tracking-[0.25em]">Quick Actions</h3>
                                    <div className="h-px flex-1 mx-4 bg-white/10"></div>
                                    <Star size={12} className="text-[#F5E6D3]" />
                                </div>

                                {/* Main CTA: Invitation */}
                                <motion.div
                                    onClick={() => router.push("/users/invite")}
                                    whileTap={{ scale: 0.97 }}
                                    className="relative w-full h-44 rounded-[3rem] overflow-hidden cursor-pointer shadow-2xl shadow-black/40 border border-white/10 group"
                                >
                                    <img src="/invite_banner.png" alt="Invite" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                                    <div className="absolute bottom-0 left-0 right-0 p-8 pt-0 flex flex-col items-start justify-end h-full">
                                        <span className="bg-[#F5E6D3] px-4 py-1.5 rounded-full text-[9px] font-black text-[#3E2723] uppercase tracking-widest mb-3 shadow-lg">Invite</span>
                                        <h2 className="text-2xl font-black text-white leading-none tracking-tight">Invite Friends</h2>
                                        <p className="text-[10px] text-white/70 font-bold mt-2 uppercase tracking-wide">Grow your network together</p>
                                    </div>
                                </motion.div>

                                {/* Modern Bento Hub - Dark Premium Redesign */}
                                <div className="grid grid-cols-6 gap-4 auto-rows-fr">
                                    {/* Primary Action: Recharge (Large Bento) */}
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleRechargeClick}
                                        className="col-span-3 row-span-1 bg-[#7B3F00] backdrop-blur-xl rounded-[2.5rem] p-6 flex flex-col items-start justify-between border border-[#F5E6D3]/10 relative overflow-hidden group hover:bg-[#7B3F00]/80 transition-all shadow-2xl shadow-black/40"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-[#F5E6D3]/10 flex items-center justify-center text-[#F5E6D3] mb-4 group-hover:scale-110 transition-transform shadow-inner border border-[#F5E6D3]/10">
                                            <Wallet size={24} strokeWidth={2.5} />
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className="text-[10px] font-black text-[#F5E6D3]/60 uppercase tracking-widest leading-none mb-1">Wallet</span>
                                            <span className="text-sm font-black text-[#F5E6D3] tracking-tight">ADD MONEY</span>
                                        </div>
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#F5E6D3]/5 rounded-full blur-3xl -mr-8 -mt-8"></div>
                                    </motion.button>

                                    {/* Primary Action: Payouts (Large Bento) */}
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => router.push("/users/withdraw")}
                                        className="col-span-3 row-span-1 bg-[#7B3F00] backdrop-blur-xl rounded-[2.5rem] p-6 flex flex-col items-start justify-between border border-[#F5E6D3]/10 relative overflow-hidden group hover:bg-[#7B3F00]/80 transition-all shadow-2xl shadow-black/40"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-[#F5E6D3]/10 flex items-center justify-center text-[#F5E6D3] mb-4 group-hover:scale-110 transition-transform shadow-inner border border-[#F5E6D3]/10">
                                            <Coins size={24} strokeWidth={2.5} />
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className="text-[10px] font-black text-[#F5E6D3]/60 uppercase tracking-widest leading-none mb-1">Exchange</span>
                                            <span className="text-sm font-black text-[#F5E6D3] tracking-tight">CASH OUT</span>
                                        </div>
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#F5E6D3]/5 rounded-full blur-3xl -mr-8 -mt-8"></div>
                                    </motion.button>

                                    {/* Secondary Action: Collections (Compact Bento) */}
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => router.push("/users/product")}
                                        className="col-span-2 row-span-1 bg-[#7B3F00] backdrop-blur-xl rounded-3xl p-4 flex flex-col items-center justify-center gap-3 border border-[#F5E6D3]/10 group px-2 hover:bg-[#7B3F00]/80 transition-all shadow-2xl shadow-black/40"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-[#F5E6D3]/10 flex items-center justify-center text-[#F5E6D3] group-hover:rotate-12 transition-transform">
                                            <Package size={20} strokeWidth={2.5} />
                                        </div>
                                        <span className="text-[9px] font-black text-[#F5E6D3] uppercase tracking-tighter">PRODUCTS</span>
                                    </motion.button>

                                    {/* Secondary Action: VIP Rules (Compact Bento) */}
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => router.push("/users/vip-rules")}
                                        className="col-span-2 row-span-1 bg-[#7B3F00] backdrop-blur-xl rounded-3xl p-4 flex flex-col items-center justify-center gap-3 border border-[#F5E6D3]/10 group px-2 hover:bg-[#7B3F00]/80 transition-all shadow-2xl shadow-black/40"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-[#F5E6D3]/10 flex items-center justify-center text-[#F5E6D3] group-hover:rotate-12 transition-transform">
                                            <Shield size={20} strokeWidth={2.5} />
                                        </div>
                                        <span className="text-[9px] font-black text-[#F5E6D3] uppercase tracking-tighter">RULES</span>
                                    </motion.button>

                                    {/* Secondary Action: Metrics (Compact Bento) */}
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => router.push("/users/tasks")}
                                        className="col-span-2 row-span-1 bg-[#7B3F00] backdrop-blur-xl rounded-3xl p-4 flex flex-col items-center justify-center gap-3 border border-[#F5E6D3]/10 group px-2 hover:bg-[#7B3F00]/80 transition-all shadow-2xl shadow-black/40"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-[#F5E6D3]/20 flex items-center justify-center text-[#F5E6D3] group-hover:rotate-12 transition-transform">
                                            <TrendingUp size={20} strokeWidth={2.5} />
                                        </div>
                                        <span className="text-[9px] font-black text-[#F5E6D3] uppercase tracking-tighter">TASKS</span>
                                    </motion.button>
                                </div>
                            </section>

                            {/* Direct Product Integration - Compact Mobile-First */}
                            <div className="space-y-6 pt-6 pb-12">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-[11px] font-black text-[#F5E6D3] uppercase tracking-[0.25em]">Marketplace</h3>
                                    <div className="h-px flex-1 mx-4 bg-white/10"></div>
                                    <Package size={12} className="text-[#F5E6D3]" />
                                </div>

                                <div className="space-y-6">
                                    {products.map((product) => (
                                        <motion.div
                                            key={product.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            onClick={() => router.push(`/users/product/${product.id}`)}
                                            className="bg-[#F5E6D3] rounded-[2.5rem] p-5 shadow-xl relative overflow-hidden group border border-white/20 active:scale-[0.98] transition-all cursor-pointer"
                                        >
                                            {/* Sales Tracking Bar - Compact Version */}
                                            {product.showTracking && (
                                                <div className="mb-3">
                                                    <div className="bg-white/95 backdrop-blur-md rounded-xl p-2.5 border border-purple-200/50 shadow-lg shadow-purple-500/10">
                                                        <div className="flex justify-between items-end mb-1.5">
                                                            <div className="flex items-center gap-1">
                                                                <div className="relative flex h-1.5 w-1.5">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-500 opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-600"></span>
                                                                </div>
                                                                <span className="text-[8px] font-black text-purple-600 uppercase tracking-widest">Selling Fast</span>
                                                            </div>
                                                            <span className="text-[9px] font-bold text-[#1A1A1A]">
                                                                <span className="text-purple-600">{Math.min(100, Math.round(((product.trackingCurrent || 0) / (product.trackingTarget || 100)) * 100))}%</span>
                                                                <span className="text-[#1A1A1A]/40 ml-0.5">Sold</span>
                                                            </span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-gradient-to-r from-purple-100 to-blue-100 rounded-full overflow-hidden shadow-inner">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${Math.min(100, ((product.trackingCurrent || 0) / (product.trackingTarget || 100)) * 100)}%` }}
                                                                transition={{ duration: 1.5, ease: "easeOut" }}
                                                                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full shadow-[0_0_12px_rgba(168,85,247,0.5)]"
                                                            ></motion.div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Product Image Stage - Compact */}
                                            <div className="aspect-[2/1] w-full rounded-2xl overflow-hidden bg-[#F9F9F9] relative shadow-inner border border-[#1A1A1A]/5">
                                                {product.imageUrl ? (
                                                    <img
                                                        src={product.imageUrl}
                                                        alt={product.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[#1A1A1A]/10">
                                                        <Package size={36} strokeWidth={1} />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-4 space-y-4">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="text-lg font-black text-[#1A1A1A] tracking-tight">{product.name}</h3>
                                                    <div className="text-right">
                                                        <span className="text-[8px] font-black text-[#1A1A1A]/20 uppercase tracking-widest block mb-0.5">Price</span>
                                                        <span className="text-lg font-black text-[#8B5E3C]">
                                                            {product.price?.toLocaleString()}
                                                            <span className="text-[9px] ml-1 text-[#8B5E3C]/60">ETB</span>
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="bg-[#1A1A1A]/5 rounded-2xl p-3">
                                                        <span className="text-[8px] font-black text-[#1A1A1A]/40 uppercase tracking-widest block mb-0.5">Daily</span>
                                                        <p className="text-sm font-black text-[#1A1A1A]">
                                                            {product.dailyIncome?.toLocaleString()}
                                                            <span className="text-[9px] ml-1 opacity-40">ETB</span>
                                                        </p>
                                                    </div>
                                                    <div className="bg-[#1A1A1A]/5 rounded-2xl p-3">
                                                        <span className="text-[8px] font-black text-[#1A1A1A]/40 uppercase tracking-widest block mb-0.5">Period</span>
                                                        <p className="text-sm font-black text-[#1A1A1A]">
                                                            {product.contractPeriod}
                                                            <span className="text-[9px] ml-1 opacity-40">Days</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Action Button - Compact */}
                                                <div className="pt-1">
                                                    <div className="w-full h-11 bg-[#1A1A1A] rounded-xl flex items-center justify-center shadow-lg shadow-black/20 group-hover:bg-[#8B5E3C] transition-colors duration-500">
                                                        <span className="text-[10px] font-black text-[#F5E6D3] uppercase tracking-[0.25em]">BUY</span>
                                                    </div>
                                                </div>
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
