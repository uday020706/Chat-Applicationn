export default function Loader() {
  return (
    <div className="h-screen flex flex-col justify-center items-center bg-gray-100">

      {/* WhatsApp Logo Circle */}
      <div className="w-20 h-20 flex items-center justify-center rounded-full bg-red-500 shadow-lg">
        <span className="text-3xl">💬</span>
      </div>

      {/* Loading Text */}
      <p className="text-black text-xl font-semibold mt-5">
        Chat Application
      </p>

      {/* Spinner */}
      <div className="mt-6 w-12 h-12 border-4 border-gray-600 border-t-red-400 rounded-full animate-spin"></div>

      {/* Small Subtitle */}
      <p className="text-gray-800 text-sm mt-4">
        Loading your chats...
      </p>
    </div>
  );
}
