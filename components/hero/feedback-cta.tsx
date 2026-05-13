"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, Image as ImageIcon, Zap } from "lucide-react";
import Image from "next/image";

const PLACEHOLDER_EXAMPLES = [
  "Make it pop",
  "Email from Sarah at Acme about onboarding...",
  "Screenshot with messy client comments...",
];

export function FeedbackCTA() {
  const router = useRouter();
  const [feedbackText, setFeedbackText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Animate placeholder cycling
  useEffect(() => {
    if (feedbackText.trim()) return; // Don't cycle if user is typing

    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_EXAMPLES.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [feedbackText]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedbackText.trim() && !imagePreview) {
      return;
    }

    // Simulate processing
    setIsProcessing(true);

    // In reality, just redirect to sign up
    setTimeout(() => {
      router.push("/sign-up");
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit(e as any);
    }
  };

  const currentPlaceholder = PLACEHOLDER_EXAMPLES[placeholderIndex];

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      {/* Micro-label above input */}
      <label className="block text-sm font-medium text-white/90 mb-2 text-center sm:text-left">
        Paste feedback, email, or upload a screenshot
      </label>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Input Container */}
        <div className="flex-1 relative group">
          <Input
            type="text"
            placeholder={currentPlaceholder}
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-14 text-base pr-12 bg-white/95 backdrop-blur-sm border-2 border-white/30 text-gray-900 placeholder:text-gray-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all duration-200"
            disabled={isProcessing}
          />

          {/* Upload Button inside input */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-orange-500 transition-colors rounded"
            disabled={isProcessing}
            aria-label="Upload screenshot"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {/* CTA Button */}
        <Button
          type="submit"
          size="lg"
          className="h-14 px-8 bg-orange-500 hover:bg-orange-600 text-white font-semibold whitespace-nowrap transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-100"
          disabled={isProcessing || (!feedbackText.trim() && !imagePreview)}
        >
          {isProcessing ? (
            "Processing..."
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Turn This Into Tasks
              <ArrowRight className="ml-1 w-4 h-4" />
            </>
          )}
        </Button>
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="mt-4 relative">
          <div className="relative w-full h-32 rounded-lg overflow-hidden border-2 border-white/30 bg-white/10 backdrop-blur-sm">
            <Image
              src={imagePreview}
              alt="Preview"
              fill
              className="object-contain p-2"
            />
            <button
              type="button"
              onClick={() => {
                setImagePreview(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors"
              aria-label="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
