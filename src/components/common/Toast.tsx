import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
      {toasts.map((toast) => {
        let Icon = Info;
        let colorClasses = 'bg-slate-900 text-white border-slate-700';

        if (toast.type === 'success') {
          Icon = CheckCircle2;
          colorClasses = 'bg-emerald-900 text-emerald-50 border-emerald-700';
        } else if (toast.type === 'error') {
          Icon = AlertCircle;
          colorClasses = 'bg-rose-900 text-rose-50 border-rose-700';
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle;
          colorClasses = 'bg-amber-900 text-amber-50 border-amber-700';
        }

        return (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl transition-all duration-300 transform translate-y-0 ${colorClasses}`}
          >
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold tracking-tight">{toast.title}</h4>
              <p className="text-xs opacity-90 mt-0.5 leading-relaxed">{toast.message}</p>
            </div>
            <button
              id={`close-toast-${toast.id}`}
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
