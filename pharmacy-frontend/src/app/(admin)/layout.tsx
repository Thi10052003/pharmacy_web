import AppLayout from "@/components/layout/AppLayout";
import AuthGuard from "@/components/AuthGuard"; // GỌI ANH BẢO VỆ VÀO

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <AppLayout>
        {children}
      </AppLayout>
    </AuthGuard>
  );
}