import { useTranslation } from 'react-i18next';
import { CheckCircle, WarningCircle, Info, X } from '@phosphor-icons/react';
import { useToastStore, type ToastType } from '../stores/toastStore';

const TYPE_STYLES: Record<ToastType, { icon: typeof Info; border: string; accent: string }> = {
  success: { icon: CheckCircle, border: 'border-data-green/30', accent: 'text-data-green' },
  error: { icon: WarningCircle, border: 'border-red-500/30', accent: 'text-red-400' },
  info: { icon: Info, border: 'border-obsidian-700', accent: 'text-amber-500' },
};

// Single, app-wide toast stack. Mounted once at the root so any module can push
// notifications via the imperative `toast` helper in stores/toastStore.
export default function Toaster() {
  const { t } = useTranslation();
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const { icon: Icon, border, accent } = TYPE_STYLES[toast.type];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto bg-obsidian-900 border ${border} rounded-lg px-4 py-2.5 shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top duration-200 max-w-md`}
          >
            <Icon size={16} weight="fill" className={`flex-shrink-0 ${accent}`} />
            <span className="text-xs text-gray-200 break-words">{toast.message}</span>
            <button
              onClick={() => remove(toast.id)}
              aria-label={t('common.close')}
              className="ml-1 text-gray-500 hover:text-gray-300 flex-shrink-0 transition-premium"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
