import Sidebar from "@/components/Sidebar";

export default function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className=" min-h-screen bg-gray-50">
      <Sidebar />

      <div className="min-h-screen pt-16 md:ml-64 md:pt-0">{children}</div>
    </div>
  );
}
