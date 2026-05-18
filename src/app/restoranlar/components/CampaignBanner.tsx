'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface CampaignBannerProps {
  title?: string
  description?: string
  buttonText?: string
  onButtonClick?: () => void
}

const CampaignBanner: React.FC<CampaignBannerProps> = ({
  title = "Günün Fırsatları",
  description = "Kaçırılmayacak indirimler seni bekliyor!",
  buttonText = "İncele",
  onButtonClick
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 md:p-6 shadow-md relative overflow-hidden group mb-6"
    >
      {/* Dekoratif Arka Plan Efektleri */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-125 transition-transform duration-500" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/5 rounded-full -ml-12 -mb-12 blur-xl" />

      <div className="relative flex flex-row items-center justify-between gap-4">
        {/* Sol Taraf: İçerik */}
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm hidden sm:block">
            <span className="text-2xl">🔥</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xl sm:hidden">🔥</span>
              <h3 className="text-white font-bold text-lg md:text-xl leading-tight">
                {title}
              </h3>
            </div>
            <p className="text-orange-50 text-xs md:text-sm opacity-90 font-medium">
              {description}
            </p>
          </div>
        </div>

        {/* Sağ Taraf: Buton */}
        <button 
          onClick={onButtonClick}
          className="bg-white text-orange-600 px-6 py-2.5 rounded-full font-bold text-sm shadow-lg hover:shadow-xl hover:bg-orange-50 active:scale-95 transition-all whitespace-nowrap"
        >
          {buttonText}
        </button>
      </div>
    </motion.div>
  )
}

export default CampaignBanner
