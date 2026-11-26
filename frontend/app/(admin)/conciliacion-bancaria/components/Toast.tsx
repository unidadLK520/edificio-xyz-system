import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

type ToastProps = {
  feedbackMsg: { type: 'success' | 'error'; text: string } | null;
  setFeedbackMsg: (msg: null) => void;
};

export const Toast: React.FC<ToastProps> = ({ feedbackMsg, setFeedbackMsg }) => {
  if (!feedbackMsg) return null;
  return (
    <div
      className={`p-4 rounded-2xl flex items-center justify-between gap-3 shadow-lg border animate-in slide-in-from-top-2 duration-300 ${
        feedbackMsg.type === 'success'
          ? 'bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-950/80 dark:border-emerald-800 dark:text-emerald-200'
          : 'bg-rose-100 border-rose-300 text-rose-900 dark:bg-rose-950/80 dark:border-rose-800 dark:text-rose-200'
      }`}
    >
      <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
        {feedbackMsg.type === 'success' ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        ) : (
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
        )}
        <span>{feedbackMsg.text}</span>
      </div>
      <button onClick={() => setFeedbackMsg(null)} className="text-xs p-1 opacity-70 hover:opacity-100 cursor-pointer">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
