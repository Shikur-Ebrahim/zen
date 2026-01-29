"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { collection, addDoc } from "firebase/firestore";
import { ChevronLeft, Lock, Eye, EyeOff, Shield, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ChangePasswordPage() {
    const router = useRouter();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validation
            if (!currentPassword || !newPassword || !confirmPassword) {
                toast.error("All fields are required");
                setLoading(false);
                return;
            }

            if (newPassword.length < 6) {
                toast.error("New password must be at least 6 characters");
                setLoading(false);
                return;
            }

            if (newPassword !== confirmPassword) {
                toast.error("New passwords do not match");
                setLoading(false);
                return;
            }

            if (currentPassword === newPassword) {
                toast.error("New password must be different from current password");
                setLoading(false);
                return;
            }

            const user = auth.currentUser;
            if (!user || !user.email) {
                toast.error("Please login first");
                router.push("/");
                return;
            }

            // Re-authenticate user with current password
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);

            // Update password
            await updatePassword(user, newPassword);

            // Create notification for password change
            await addDoc(collection(db, "UserNotifications"), {
                userId: user.uid,
                type: "password_change",
                message: "Password changed successfully",
                createdAt: new Date(),
                read: false
            });

            setSuccess(true);
            toast.success("Password changed successfully!");

            // Clear form
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");

            // Redirect to profile after 3 seconds to let them see the success message
            setTimeout(() => {
                router.push("/users/profile");
            }, 3000);

        } catch (error: any) {
            console.error("Password change error:", error);

            if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
                toast.error("Current password is incorrect");
            } else if (error.code === "auth/weak-password") {
                toast.error("Password is too weak");
            } else {
                toast.error("Failed to change password. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050510] text-white font-sans selection:bg-indigo-500/30 pb-32">
            {/* Background Atmosphere */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-full h-[40%] bg-gradient-to-b from-indigo-500/10 to-transparent"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05),transparent_70%)]"></div>
            </div>

            {/* Success Overlay */}
            {success && (
                <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-500">
                    <div className="w-full max-w-sm bg-[#0A0A15] rounded-[2.5rem] p-10 shadow-2xl border border-indigo-500/20 flex flex-col items-center text-center space-y-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500"></div>

                        {/* Success Icon */}
                        <div className="w-24 h-24 rounded-full bg-indigo-500/10 flex items-center justify-center relative">
                            <div className="absolute inset-0 bg-indigo-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                            <div className="w-20 h-20 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg relative z-10">
                                <Shield className="text-white" size={40} />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-emerald-500 border-4 border-[#0A0A15] flex items-center justify-center shadow-md">
                                <CheckCircle2 size={20} className="text-white" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-3xl font-bold text-white tracking-tight">Security Updated</h2>
                            <p className="text-xs font-semibold text-indigo-400 tracking-wide">Protocol Secure</p>
                        </div>

                        <p className="text-sm text-white/50 leading-relaxed font-medium">
                            Your account is now protected with your new password. Returning to profile in a moment...
                        </p>

                        <div className="pt-4 flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Header */}
            <header className="sticky top-0 z-[60] bg-[#050510]/90 backdrop-blur-2xl border-b border-indigo-500/10 px-6 h-24 flex items-center justify-between max-w-lg mx-auto shadow-2xl">
                <div className="flex items-center gap-5">
                    <button
                        onClick={() => router.back()}
                        className="w-12 h-12 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center text-indigo-400 hover:bg-indigo-500/10 transition-all active:scale-90"
                    >
                        <ChevronLeft size={24} strokeWidth={2.5} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight leading-none">Security Center</h1>
                        <div className="flex items-center gap-2 mt-2">
                            <Shield className="text-indigo-400" size={12} />
                            <span className="text-[10px] font-bold text-indigo-400/60 uppercase tracking-widest">Access Control</span>
                        </div>
                    </div>
                </div>
                <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-xl">
                    <Lock size={22} strokeWidth={2} />
                </div>
            </header>

            <main className="px-6 py-10 max-w-lg mx-auto relative z-10">
                {/* Info Card */}
                <div className="mb-10 group relative bg-[#0A0A1F] p-7 rounded-[2.5rem] border border-indigo-500/10 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-1000">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <div className="flex items-start gap-5 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 flex-shrink-0 border border-indigo-500/20">
                            <Shield size={24} strokeWidth={2} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xs font-bold text-indigo-400 tracking-wider">Security Protocol</h3>
                            <p className="text-[11px] text-white/40 leading-relaxed font-medium">
                                Choose a strong password with at least 6 characters. Avoid using names or birthdays.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Password Change Form */}
                <form onSubmit={handleChangePassword} className="space-y-8">
                    {/* Current Password */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-indigo-400/60 tracking-wider pl-2">
                            Current Password
                        </label>
                        <div className="relative group/input">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 transition-colors group-focus-within/input:text-indigo-400">
                                <Lock size={20} />
                            </div>
                            <input
                                type={showCurrentPassword ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                                className="w-full h-16 pl-14 pr-14 rounded-2xl bg-[#0A0A15] border border-white/5 focus:border-indigo-500/40 focus:bg-[#0A0A20] focus:outline-none text-white transition-all shadow-inner placeholder:text-white/10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 hover:text-indigo-400 transition-colors"
                            >
                                {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {/* New Password */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-indigo-400/60 tracking-wider pl-2">
                            New Password
                        </label>
                        <div className="relative group/input">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 transition-colors group-focus-within/input:text-indigo-400">
                                <Lock size={20} />
                            </div>
                            <input
                                type={showNewPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                className="w-full h-16 pl-14 pr-14 rounded-2xl bg-[#0A0A15] border border-white/5 focus:border-indigo-500/40 focus:bg-[#0A0A20] focus:outline-none text-white transition-all shadow-inner placeholder:text-white/10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 hover:text-indigo-400 transition-colors"
                            >
                                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm New Password */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-indigo-400/60 tracking-wider pl-2">
                            Confirm New Password
                        </label>
                        <div className="relative group/input">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 transition-colors group-focus-within/input:text-indigo-400">
                                <Lock size={20} />
                            </div>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                className="w-full h-16 pl-14 pr-14 rounded-2xl bg-[#0A0A15] border border-white/5 focus:border-indigo-500/40 focus:bg-[#0A0A20] focus:outline-none text-white transition-all shadow-inner placeholder:text-white/10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 hover:text-indigo-400 transition-colors"
                            >
                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {/* Password Requirements */}
                    <div className="bg-[#0A0A1A] rounded-2xl p-6 border border-indigo-500/5 shadow-inner">
                        <p className="text-[10px] font-bold text-white/20 mb-4 uppercase tracking-widest">Complexity Requirements:</p>
                        <div className="grid grid-cols-1 gap-3">
                            <div className={`flex items-center gap-3 transition-colors ${newPassword.length >= 6 ? 'text-indigo-400' : 'text-white/10'}`}>
                                <CheckCircle2 size={16} strokeWidth={2.5} />
                                <span className="text-[11px] font-semibold tracking-tight">Minimum 6 characters</span>
                            </div>
                            <div className={`flex items-center gap-3 transition-colors ${newPassword && confirmPassword && newPassword === confirmPassword ? 'text-indigo-400' : 'text-white/10'}`}>
                                <CheckCircle2 size={16} strokeWidth={2.5} />
                                <span className="text-[11px] font-semibold tracking-tight">Passwords match</span>
                            </div>
                            <div className={`flex items-center gap-3 transition-colors ${newPassword && currentPassword && newPassword !== currentPassword ? 'text-indigo-400' : 'text-white/10'}`}>
                                <CheckCircle2 size={16} strokeWidth={2.5} />
                                <span className="text-[11px] font-semibold tracking-tight">New password is unique</span>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-16 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl tracking-wide transition-all disabled:opacity-20 disabled:cursor-not-allowed shadow-[0_15px_30px_rgba(79,70,229,0.3)] flex items-center justify-center gap-3 group active:scale-[0.98]"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span className="animate-pulse">Updating...</span>
                            </>
                        ) : (
                            <>
                                <Lock size={20} strokeWidth={2.5} />
                                <span>Change Password</span>
                            </>
                        )}
                    </button>
                </form>
            </main>
        </div>
    );
}
