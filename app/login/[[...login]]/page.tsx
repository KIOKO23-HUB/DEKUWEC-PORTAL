import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 py-12 px-4">
      <div className="mb-6 flex items-center space-x-3">
        <span className="text-2xl font-black text-emerald-900 tracking-tight">DEKUWEC</span>
      </div>
      <SignIn 
        routing="path" 
        path="/login" 
        fallbackRedirectUrl="/dashboard"
        signUpUrl="/signup"
        appearance={{
          variables: {
            colorPrimary: '#064e3b',
          },
        }}
      />
    </div>
  );
}
