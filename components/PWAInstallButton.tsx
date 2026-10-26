'use client';

import React, { useState } from 'react';
import { Smartphone, Share, PlusSquare, X, CheckCircle2, Download, Sparkles, ArrowDown } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export default function PWAInstallButton() {
  const { isInstallable, isStandalone, isIOS, triggerInstall } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // If already running in standalone mode on iPhone home screen:
  if (isStandalone) {
    return (
      <div
        title="شما در حال استفاده از نسخه مستقل (Standalone) اپلیکیشن روی گوشی هستید."
        className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
      >
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        <span className="hidden xs:inline">نسخه مستقل (Standalone)</span>
      </div>
    );
  }

  const handleClick = () => {
    if (isInstallable) {
      triggerInstall();
    } else {
      setShowIOSModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-50/80 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 transition shadow-sm"
        title="نصب نسخه مستقل روی صفحه اصلی آیفون و موبایل"
      >
        <Smartphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="hidden sm:inline">نصب روی صفحه اصلی گوشی</span>
        <span className="sm:hidden">نصب اپ</span>
      </button>

      {/* iOS Safari Step-by-Step Installation Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in text-right">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">نصب روی صفحه اصلی (iPhone Home Screen)</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    اجرا به‌صورت اپلیکیشن مستقل (Standalone) بدون نوار مرورگر
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Steps */}
            <div className="space-y-3.5 py-4 text-xs">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  با افزودن این برنامه به صفحه اصلی آیفون، دسترسی به دوربین و تنظیمات تصاویر سریع‌تر شده و مانند یک نرم‌افزار نیتیو بدون کادرهای اضافی سافاری اجرا خواهد شد.
                </p>
              </div>

              {/* Step 1 */}
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs">
                  ۱
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>لمس دکمه اشتراک‌گذاری در سافاری</span>
                    <Share className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 inline" />
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    در نوار پایین مرورگر سافاری آیفون، آیکون <strong>Share</strong> (مربع با فلش رو به بالا) را بزنید.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs">
                  ۲
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>انتخاب «Add to Home Screen»</span>
                    <PlusSquare className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 inline" />
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    در لیست بازشده به پایین اسکرول کنید و گزینه <strong>Add to Home Screen (افزودن به صفحه اصلی)</strong> را انتخاب کنید.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs">
                  ۳
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    تایید و زدن دکمه Add
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    در گوشه بالای صفحه دکمه <strong>Add</strong> را بزنید. آیکون برنامه در کنار بقیه برنامه‌های آیفون قرار می‌گیرد.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 pt-3 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 transition shadow-sm"
              >
                متوجه شدم، بستن راهنما
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
