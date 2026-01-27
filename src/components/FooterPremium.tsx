"use client";

import { useState } from "react";
import {
  SparklesIcon,
  Clock01Icon,
  PercentCircleIcon,
  FlashIcon,
  Cancel01Icon
} from "hugeicons-react";
import ModalAssinatura from "./ModalAssinatura";

export default function FooterPremium() {
  const [modalAberto, setModalAberto] = useState(false);
  const [fechado, setFechado] = useState(false);

  if (fechado) return null;

  return (
    <>
      {/* Banner fixo no rodapé */}
      <div className="fixed bottom-0 left-0 right-0 py-8 px-8 flex items-center justify-between z-40 shadow-lg" style={{ backgroundColor: '#E3F7ED' }}>
        {/* Botão X para fechar */}
        <button
          onClick={() => setFechado(true)}
          className="absolute top-2 right-3 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
        >
          <Cancel01Icon size={20} />
        </button>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <SparklesIcon size={24} className="text-emerald-600" />
            <span className="text-lg text-gray-800 font-bold">
              Questiongo Premium
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <span className="flex items-center gap-1.5">
              <Clock01Icon size={16} />
              30 min de vantagem
            </span>
            <span className="flex items-center gap-1.5">
              <PercentCircleIcon size={16} />
              Taxa de apenas 5%
            </span>
            <span className="flex items-center gap-1.5">
              <FlashIcon size={16} />
              Saques instantâneos
            </span>
          </div>
        </div>

        <button
          onClick={() => setModalAberto(true)}
          className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all cursor-pointer shadow-md font-bold"
        >
          Assinar Premium
        </button>
      </div>

      {/* Modal de Assinatura */}
      <ModalAssinatura
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
      />
    </>
  );
}
