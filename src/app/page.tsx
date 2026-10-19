"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ASSETS } from "@/config/assets";
import PlaceholderImage from "@/components/PlaceholderImage";
import LoginModal from "@/components/LoginModal";

export default function WelcomePage() {
  const [showLogin, setShowLogin] = useState(false);
  const router = useRouter();

  return (
    <div className="relative min-h-screen bg-white flex flex-col items-center justify-center overflow-hidden">
      {/* Binary watermark background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[.00] select-none">
        <div className="text-[200px] font-mono text-navy leading-none tracking-widest">
          {"01001 10010 01101 00110 11001 01010 10101 01010 10110 01001 10010 01101 00110 11001 01010 10101 01010 10110 01001 10010 01101 00110 11001 01010"
            .split(" ")
            .map((s, i) => (
              <span key={i} className="inline-block mx-2">
                {s}
              </span>
            ))}
        </div>
      </div>

      {/* Watermark image */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[1.0]">
        <PlaceholderImage
          src={ASSETS.binaryWatermark}
          alt=""
          className="w-[2700px] h-[2700px] object-contain rounded-full opacity-15"
          fallbackText=""
          fallbackClassName="rounded-full bg-gray-100"
        />
      </div>

      {/* Roman Helmet - Admin entry point */}
      <button
        onClick={() => setShowLogin(true)}
        className="absolute top-6 left-6 z-20 w-18 h-18 bg-navy rounded-full border-2 border-gold-accent flex items-center justify-center hover:bg-navy-light transition-colors cursor-pointer"
        title="Administrator Login"
        aria-label="Open administrator login"
      >
        <PlaceholderImage
          src={ASSETS.romanHelmet}
          alt="Admin"
          width={40}
          height={40}
          className="object-contain"
          fallbackText="⛑"
          fallbackClassName="text-gold-accent text-lg bg-transparent"
        />
      </button>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-2xl">
        {/* Institutional logo */}
        <div className="mb-6">
          <PlaceholderImage
            src={ASSETS.dictLogo}
            alt="DICT Logo"
            width={400}
            height={400}
            className="rounded-full object-contain"
            fallbackText="DICT"
            fallbackClassName="rounded-full bg-blue-50 text-blue-600 text-sm font-bold w-[120px] h-[120px]"
          />
        </div>

        {/* COGNĪTA wordmark */}
        <h1 className="text-5xl md:text-6xl font-serif font-bold text-navy tracking-wider mb-2">
          COGNĪTA
        </h1>
        <p className="text-lg text-navy-light font-medium mb-8">
          By DICT Iligan
        </p>

        {/* Purpose explanation */}
        <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-6 mb-8 max-w-lg">
          <p className="text-navy text-sm leading-relaxed">
            Welcome to the DICT Iligan Training Room Feedback System. Your
            feedback helps us improve the training room experience for everyone.
            Please take a moment to share your thoughts about the facilities,
            equipment, and overall environment.
          </p>
        </div>

        {/* Proceed button */}
        <button
          onClick={() => router.push("/survey")}
          className="bg-survey-blue hover:bg-survey-blue-hover hover: border-2 hover:border-yellow-300 text-white font-semibold py-3 px-10 rounded-lg text-lg transition-colors shadow-md hover:shadow-lg"
        >
          Proceed to Survey
        </button>

        {/* Privacy notice */}
        <p className="mt-6 text-xs text-gray-400 max-w-md">
          Your responses are confidential. Names are optional. Submission time
          and computer identifier may be recorded for operational purposes.
        </p>
      </div>

      {/* Login modal */}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}
