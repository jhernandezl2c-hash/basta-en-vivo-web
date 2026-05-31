import { Loader2 } from 'lucide-react';

export default function RoomLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700">
        <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
        Cargando sala…
      </div>
    </div>
  );
}
