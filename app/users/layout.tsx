import BottomNav from "@/components/BottomNav";

export default function UsersLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-slate-50">
            {children}
            <BottomNav />
        </div>
    );
}
