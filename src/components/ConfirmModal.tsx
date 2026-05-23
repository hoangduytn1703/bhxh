import { AlertTriangle } from "lucide-react";
import React from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Xác nhận",
  cancelText = "Hủy bỏ"
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
          <p className="text-sm text-slate-500 font-medium">
            {message}
          </p>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
