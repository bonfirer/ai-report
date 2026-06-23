import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatCircleDots, PaperPlaneTilt } from '@phosphor-icons/react';
import { useAlertStore } from '../stores/alertStore';
import { alertsApi } from '../lib/api';

export default function FeishuModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { feishu, fetchFeishu, updateFeishu } = useAlertStore();

  const [webhookUrl, setWebhookUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [enabled, setEnabled] = useState(false);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    fetchFeishu();
  }, [fetchFeishu]);

  useEffect(() => {
    if (feishu) {
      setWebhookUrl(feishu.webhook_url);
      setEnabled(feishu.enabled);
    }
  }, [feishu]);

  const flash = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      await updateFeishu({
        webhook_url: webhookUrl,
        ...(secret ? { secret } : {}),
        enabled,
      });
      setSecret('');
      flash('ok', t('alerts.saved'));
    } catch (e) {
      flash('err', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleTest = async () => {
    if (!webhookUrl.trim()) { flash('err', t('alerts.feishu.webhookRequired')); return; }
    setBusy(true);
    try {
      // Persist current values first so the test uses them.
      await handleSave();
      const res = await alertsApi.testFeishu();
      flash('ok', res.message);
    } catch (e) {
      flash('err', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const labelCls = 'block text-[11px] font-medium text-gray-400 mb-1';
  const inputCls = 'w-full bg-obsidian-900 border border-obsidian-700 rounded-md px-2.5 py-1.5 text-xs text-gray-200 focus:border-amber-500/50 focus:outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-obsidian-900 border border-obsidian-700 rounded-xl p-5 w-[460px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
            <ChatCircleDots size={16} className="text-amber-500" />
            {t('alerts.feishuSettings')}
          </h3>
          {msg && (
            <span className={`text-[11px] px-2 py-1 rounded ${msg.type === 'ok' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {msg.text}
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className={labelCls}>{t('alerts.feishu.webhook')}</label>
            <input
              className={inputCls}
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxxx"
            />
            <p className="text-[10px] text-gray-600 mt-1">{t('alerts.feishu.webhookHint')}</p>
          </div>

          <div>
            <label className={labelCls}>{t('alerts.feishu.secret')}</label>
            <input
              className={inputCls}
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder={feishu?.secret_set ? '••••••••' : ''}
              autoComplete="new-password"
            />
            <p className="text-[10px] text-gray-600 mt-1">{t('alerts.feishu.secretHint')}</p>
          </div>

          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-amber-500" />
            {t('alerts.feishu.enabled')}
          </label>

          <div className="border-t border-obsidian-700 pt-3">
            <button onClick={handleTest} disabled={busy} className="px-3 py-1.5 rounded-md bg-obsidian-800 text-gray-200 text-xs hover:bg-obsidian-700 disabled:opacity-50 flex items-center gap-1.5">
              <PaperPlaneTilt size={12} />
              {t('alerts.feishu.testSend')}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-5">
          <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1.5 rounded-md border border-obsidian-700">
            {t('common.cancel')}
          </button>
          <button onClick={handleSave} disabled={busy} className="text-xs text-[#08080c] bg-amber-500 hover:bg-amber-400 px-4 py-1.5 rounded-md font-semibold disabled:opacity-50">
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
