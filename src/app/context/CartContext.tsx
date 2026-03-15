'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Product, CartItemLocal } from '@/types/menu'

interface CartContextType {
  cart: CartItemLocal[]
  addToCart: (product: Product, quantity?: number, note?: string) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  updateNote: (productId: string, note: string) => void
  clearCart: () => void
  getCartTotal: () => number
  getCartItemCount: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItemLocal[]>([])

  // LocalStorage'dan sepeti yükle
  useEffect(() => {
    const savedCart = localStorage.getItem('mergen_cart')
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart))
      } catch (error) {
        console.error('Sepet yüklenemedi:', error)
      }
    }
  }, [])

  // Sepet değiştiğinde LocalStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('mergen_cart', JSON.stringify(cart))
  }, [cart])

  const addToCart = (product: Product, quantity: number = 1, note?: string) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id)
      
      if (existingItem) {
        // Ürün zaten sepette, miktarı artır
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity, item_note: note || item.item_note }
            : item
        )
      } else {
        // Yeni ürün ekle
        return [...prevCart, { product, quantity, item_note: note }]
      }
    })
  }

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
    } else {
      setCart(prevCart =>
        prevCart.map(item =>
          item.product.id === productId ? { ...item, quantity } : item
        )
      )
    }
  }

  const updateNote = (productId: string, note: string) => {
    setCart(prevCart =>
      prevCart.map(item =>
        item.product.id === productId ? { ...item, item_note: note } : item
      )
    )
  }

  const clearCart = () => {
    setCart([])
    localStorage.removeItem('mergen_cart')
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.product.price * item.quantity, 0)
  }

  const getCartItemCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0)
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateNote,
        clearCart,
        getCartTotal,
        getCartItemCount
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
