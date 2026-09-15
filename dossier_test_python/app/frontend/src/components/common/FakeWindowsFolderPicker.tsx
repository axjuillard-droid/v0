import React from 'react';
import { X } from './Icons';

interface FakeWindowsFolderPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFolder: (path: string) => void;
}

export const FakeWindowsFolderPicker: React.FC<FakeWindowsFolderPickerProps> = ({
  isOpen,
  onClose,
  onSelectFolder,
}) => {
  if (!isOpen) return null;

  const handleSelect = () => {
    onSelectFolder('C:/Users/Demo/Téléchargements/apéro');
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans text-gray-800">
      {/* Fenêtre Windows 10/11 Explorer */}
      <div data-tour="fake-explorer-modal" className="bg-[#fcfcfc] border border-[#d9d9d9] rounded-xl shadow-2xl w-full max-w-[850px] overflow-hidden flex flex-col h-[520px] text-xs">
        
        {/* 1. Title bar */}
        <div className="bg-[#f3f3f3] border-b border-[#e5e5e5] px-4 py-2 flex items-center justify-between select-none">
          <span className="font-semibold text-gray-700 text-xs">Sélectionner un dossier à scanner</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-red-600 p-1 hover:bg-gray-200 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Breadcrumb Navigation Bar */}
        <div className="bg-white border-b border-[#e5e5e5] p-2 flex items-center gap-2">
          <div className="flex-1 bg-[#f9f9f9] border border-[#e0e0e0] rounded px-3 py-1.5 flex items-center gap-2 text-gray-600 font-mono text-xs">
            <span>📁</span>
            <span>Téléchargements</span>
            <span>&gt;</span>
            <span className="font-bold text-gray-900">apéro</span>
          </div>
          <div className="border border-[#e0e0e0] rounded px-3 py-1.5 text-gray-400 bg-white">
            Rechercher dans : apéro
          </div>
        </div>

        {/* 3. Main Body Explorer */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-[180px] bg-[#f9f9f9] border-r border-[#e5e5e5] p-3 flex flex-col gap-2 select-none text-gray-600">
            <span className="font-bold text-[11px] text-gray-400 uppercase tracking-wider mb-1">Accès rapide</span>
            <div className="flex items-center gap-2 px-2 py-1.5 bg-[#e5e5e5] rounded text-gray-900 font-medium">
              <span>⬇️</span> Téléchargements
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-200 rounded cursor-pointer">
              <span>📄</span> Documents
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-200 rounded cursor-pointer">
              <span>🖥️</span> Ce PC
            </div>
          </div>

          {/* Main Folder List Table */}
          <div className="flex-1 bg-white p-4 overflow-y-auto">
            {/* Table Header */}
            <div className="grid grid-cols-12 text-[11px] text-gray-500 font-medium pb-2 border-b border-gray-200 mb-3">
              <span className="col-span-6">Nom</span>
              <span className="col-span-3">Modifié le</span>
              <span className="col-span-3">Type</span>
            </div>

            {/* Group Header */}
            <div className="text-[11px] font-bold text-gray-500 mb-2 flex items-center gap-1">
              <span>▼</span> Aujourd'hui
            </div>

            {/* List items */}
            <div className="flex flex-col gap-1">
              <div className="grid grid-cols-12 items-center px-2 py-1.5 hover:bg-[#e8f0fe] rounded text-gray-800 cursor-pointer font-medium">
                <span className="col-span-6 flex items-center gap-2">
                  <span className="text-amber-500 text-base">📁</span> sandwich
                </span>
                <span className="col-span-3 text-gray-500 text-[11px]">22/07/2026 10:31</span>
                <span className="col-span-3 text-gray-500 text-[11px]">Dossier de fichiers</span>
              </div>

              <div className="grid grid-cols-12 items-center px-2 py-1.5 hover:bg-[#e8f0fe] rounded text-gray-800 cursor-pointer font-medium">
                <span className="col-span-6 flex items-center gap-2">
                  <span className="text-amber-500 text-base">📁</span> fromage
                </span>
                <span className="col-span-3 text-gray-500 text-[11px]">22/07/2026 10:31</span>
                <span className="col-span-3 text-gray-500 text-[11px]">Dossier de fichiers</span>
              </div>

              <div className="grid grid-cols-12 items-center px-2 py-1.5 bg-[#dce7f9] border border-[#a6c8ff] rounded text-gray-900 cursor-pointer font-semibold">
                <span className="col-span-6 flex items-center gap-2">
                  <span className="text-amber-500 text-base">📁</span> bière
                </span>
                <span className="col-span-3 text-gray-500 text-[11px]">22/07/2026 10:31</span>
                <span className="col-span-3 text-gray-500 text-[11px]">Dossier de fichiers</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Bottom Selection Bar */}
        <div className="bg-[#f3f3f3] border-t border-[#e5e5e5] p-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-gray-600 font-medium">Dossier :</span>
            <div className="bg-white border border-[#cccccc] rounded px-3 py-1.5 flex-1 font-mono text-gray-800 text-xs">
              apéro
            </div>
          </div>
          <button
            onClick={handleSelect}
            data-tour="btn-select-demo-folder"
            className="bg-[#0067c0] hover:bg-[#005aab] text-white px-5 py-2 rounded-lg font-semibold shadow transition-all cursor-pointer text-xs"
          >
            Sélectionner ce dossier
          </button>
        </div>
      </div>
    </div>
  );
};
