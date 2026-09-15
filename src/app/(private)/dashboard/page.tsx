import LogoutButton from "@/components/LogoutButton";

export default function DashboardPage() {
  return (
    <main className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>

          <p className="mt-2 text-gray-600">
            Bienvenido al sistema de gestión de obras.
          </p>
        </div>
      </div>
    </main>
  );
}
