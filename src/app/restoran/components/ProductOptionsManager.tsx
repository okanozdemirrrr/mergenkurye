'use client'

import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

export interface Option {
  name: string
  price_modifier: number
}

export interface OptionGroup {
  name: string
  type: 'radio' | 'checkbox'
  options: Option[]
}

interface ProductOptionsManagerProps {
  options: OptionGroup[]
  onChange: (options: OptionGroup[]) => void
  darkMode: boolean
}

export default function ProductOptionsManager({ options = [], onChange, darkMode }: ProductOptionsManagerProps) {
  const [expandedGroups, setExpandedGroups] = useState<{ [key: number]: boolean }>({ 0: true })

  const toggleGroup = (index: number) => {
    setExpandedGroups(prev => ({ ...prev, [index]: !prev[index] }))
  }

  const addGroup = () => {
    const newGroups = [
      ...options,
      {
        name: '',
        type: 'radio' as const,
        options: [{ name: '', price_modifier: 0 }]
      }
    ]
    onChange(newGroups)
    setExpandedGroups(prev => ({ ...prev, [newGroups.length - 1]: true }))
  }

  const removeGroup = (groupIndex: number) => {
    const newGroups = options.filter((_, idx) => idx !== groupIndex)
    onChange(newGroups)
  }

  const handleGroupChange = (groupIndex: number, field: keyof OptionGroup, value: any) => {
    const newGroups = options.map((group, idx) => {
      if (idx === groupIndex) {
        return { ...group, [field]: value }
      }
      return group
    })
    onChange(newGroups)
  }

  const addOption = (groupIndex: number) => {
    const newGroups = options.map((group, idx) => {
      if (idx === groupIndex) {
        return {
          ...group,
          options: [...group.options, { name: '', price_modifier: 0 }]
        }
      }
      return group
    })
    onChange(newGroups)
  }

  const removeOption = (groupIndex: number, optionIndex: number) => {
    const newGroups = options.map((group, idx) => {
      if (idx === groupIndex) {
        return {
          ...group,
          options: group.options.filter((_, oIdx) => oIdx !== optionIndex)
        }
      }
      return group
    })
    onChange(newGroups)
  }

  const handleOptionChange = (groupIndex: number, optionIndex: number, field: keyof Option, value: any) => {
    const newGroups = options.map((group, idx) => {
      if (idx === groupIndex) {
        const newOptions = group.options.map((option, oIdx) => {
          if (oIdx === optionIndex) {
            return { ...option, [field]: value }
          }
          return option
        })
        return { ...group, options: newOptions }
      }
      return group
    })
    onChange(newGroups)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-2 border-slate-800">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          ⚙️ Opsiyon Yönetimi
        </h3>
        <button
          type="button"
          onClick={addGroup}
          className="flex items-center gap-1 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={14} /> Yeni Grup Ekle
        </button>
      </div>

      {options.length === 0 ? (
        <div className="text-center py-6 bg-slate-850 rounded-lg border border-dashed border-slate-800">
          <p className="text-sm text-slate-500">Bu ürün için henüz opsiyon tanımlanmamış.</p>
          <p className="text-xs text-slate-600 mt-1">Grup ekleyerek boyut, ekstra malzeme veya sos seçimi tanımlayabilirsiniz.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {options.map((group, groupIndex) => (
            <div
              key={groupIndex}
              className={`border rounded-xl overflow-hidden ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'
              }`}
            >
              {/* Group Header */}
              <div
                onClick={() => toggleGroup(groupIndex)}
                className={`flex items-center justify-between p-4 cursor-pointer select-none transition-colors ${
                  darkMode ? 'hover:bg-slate-850 bg-slate-900' : 'hover:bg-gray-50 bg-gray-50'
                }`}
              >
                <div className="flex-1 flex gap-3 items-center" onClick={e => e.stopPropagation()}>
                  <input
                    type="text"
                    required
                    value={group.name}
                    onChange={e => handleGroupChange(groupIndex, 'name', e.target.value)}
                    placeholder="Grup Adı (Örn: Boyut Seçimi)"
                    className={`px-3 py-1.5 rounded-lg border text-sm font-semibold outline-none transition-colors w-1/2 ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white focus:border-orange-500'
                        : 'bg-white border-gray-300 text-gray-900 focus:border-orange-500'
                    }`}
                  />
                  <select
                    value={group.type}
                    onChange={e => handleGroupChange(groupIndex, 'type', e.target.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm outline-none transition-colors w-1/3 ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white focus:border-orange-500'
                        : 'bg-white border-gray-300 text-gray-900 focus:border-orange-500'
                    }`}
                  >
                    <option value="radio">Tekli Seçim (Radio)</option>
                    <option value="checkbox">Çoklu Seçim (Checkbox)</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-3 ml-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeGroup(groupIndex)
                    }}
                    className="p-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors"
                    title="Grubu Sil"
                  >
                    <Trash2 size={16} />
                  </button>
                  <span className="text-slate-500">
                    {expandedGroups[groupIndex] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </span>
                </div>
              </div>

              {/* Group Body (Options List) */}
              {expandedGroups[groupIndex] && (
                <div className={`p-4 border-t ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-gray-150 bg-gray-50/30'} space-y-3`}>
                  <div className="space-y-2">
                    {group.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center gap-3">
                        <input
                          type="text"
                          required
                          value={option.name}
                          onChange={e => handleOptionChange(groupIndex, optionIndex, 'name', e.target.value)}
                          placeholder="Seçenek Adı (Örn: Büyük Boy)"
                          className={`flex-1 px-3 py-2 rounded-lg border text-xs outline-none transition-colors ${
                            darkMode
                              ? 'bg-slate-800 border-slate-700 text-white focus:border-orange-500'
                              : 'bg-white border-gray-300 text-gray-900 focus:border-orange-500'
                          }`}
                        />
                        <div className="flex items-center gap-1 w-32">
                          <input
                            type="number"
                            step="0.01"
                            value={option.price_modifier === 0 ? '' : option.price_modifier}
                            onChange={e => {
                              const val = parseFloat(e.target.value)
                              handleOptionChange(groupIndex, optionIndex, 'price_modifier', isNaN(val) ? 0 : val)
                            }}
                            placeholder="+0.00"
                            className={`w-full px-3 py-2 rounded-lg border text-xs text-right outline-none transition-colors ${
                              darkMode
                                ? 'bg-slate-800 border-slate-700 text-white focus:border-orange-500'
                                : 'bg-white border-gray-300 text-gray-900 focus:border-orange-500'
                            }`}
                          />
                          <span className="text-xs text-slate-400">₺</span>
                        </div>
                        
                        {group.options.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeOption(groupIndex, optionIndex)}
                            className="p-2 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
                            title="Seçeneği Sil"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => addOption(groupIndex)}
                    className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-400 font-semibold pt-1"
                  >
                    <Plus size={14} /> Seçenek Ekle
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
