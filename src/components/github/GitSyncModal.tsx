import React, { useState, useEffect } from 'react';
import {
  X,
  GitBranch,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  GitCommit,
  ShieldCheck,
} from 'lucide-react';

interface GitSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GitStatus {
  branch: string;
  lastCommit: string;
  isClean: boolean;
  repo: string;
}

export const GitSyncModal: React.FC<GitSyncModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; details?: string } | null>(null);

  const fetchStatus = async () => {
    setIsLoadingStatus(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/git/status');
      const data = await res.json();
      if (data.success) {
        setStatus({
          branch: data.branch,
          lastCommit: data.lastCommit,
          isClean: data.isClean,
          repo: data.repo,
        });
      } else {
        setFeedback({ type: 'error', message: data.error || 'Không thể lấy trạng thái Git' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Lỗi kết nối tới máy chủ' });
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const handlePush = async () => {
    setIsPushing(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/git/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commitMessage }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: 'Đã đẩy (push) thành công toàn bộ mã nguồn lên GitHub!',
          details: data.output,
        });
        setCommitMessage('');
        await fetchStatus();
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Có lỗi xảy ra khi push lên GitHub',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Lỗi mạng khi kết nối máy chủ',
      });
    } finally {
      setIsPushing(false);
    }
  };

  const handlePull = async () => {
    setIsPulling(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/git/pull', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: 'Đã kéo (pull) cập nhật mới nhất từ GitHub thành công!',
          details: data.output,
        });
        await fetchStatus();
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Có lỗi xảy ra khi pull từ GitHub',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Lỗi mạng khi kết nối máy chủ',
      });
    } finally {
      setIsPulling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
              <GitBranch className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                Đồng Bộ GitHub (Git Push)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Quản lý đẩy & kéo mã nguồn trực tiếp với kho lưu trữ GitHub
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Repository Info Box */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Repository</span>
            <a
              href="https://github.com/truongnguyenvan113/hai-san-me-huong-v1"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800 hover:underline"
            >
              <span>truongnguyenvan113/hai-san-me-huong-v1</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="text-slate-400 font-semibold mb-0.5">Nhánh hiện tại</div>
              <div className="font-mono font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                {status?.branch || 'main'}
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="text-slate-400 font-semibold mb-0.5">Trạng thái tệp</div>
              <div className="font-bold text-slate-800">
                {status?.isClean ? (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Sạch (Đã đồng bộ)
                  </span>
                ) : (
                  <span className="text-amber-700">Có thay đổi mới</span>
                )}
              </div>
            </div>
          </div>

          {status?.lastCommit && (
            <div className="text-[11px] text-slate-500 bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-mono text-slate-700 truncate">{status.lastCommit}</span>
            </div>
          )}
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl border text-xs space-y-1 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="font-bold flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              {feedback.message}
            </div>
            {feedback.details && (
              <pre className="text-[10px] bg-white/70 p-2 rounded-lg font-mono overflow-x-auto whitespace-pre-wrap">
                {feedback.details}
              </pre>
            )}
          </div>
        )}

        {/* Commit Message Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Nội dung ghi chú commit (Tùy chọn)
          </label>
          <input
            type="text"
            placeholder="VD: Cập nhật tính năng quét bảng giá và đồng bộ Google Sheets..."
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-slate-900 font-medium transition-all"
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={handlePush}
            disabled={isPushing || isPulling}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
          >
            {isPushing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Đang Push Lên GitHub...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4 text-emerald-400" />
                <span>Đẩy Lên GitHub (Push)</span>
              </>
            )}
          </button>

          <button
            onClick={handlePull}
            disabled={isPushing || isPulling}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-slate-50 disabled:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
          >
            {isPulling ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-teal-700" />
                <span>Đang Kéo Về (Pull)...</span>
              </>
            ) : (
              <>
                <DownloadCloud className="w-4 h-4 text-teal-700" />
                <span>Kéo Về Từ GitHub (Pull)</span>
              </>
            )}
          </button>
        </div>

        {/* Security & Info Notice */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Xác thực an toàn qua GitHub Personal Access Token. Tự động đồng bộ lên cả 2 nhánh <strong>main</strong> và <strong>develop</strong>.
          </span>
        </div>
      </div>
    </div>
  );
};
