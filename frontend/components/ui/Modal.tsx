import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    children: React.ReactNode
    maxWidth?: string
}

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}
                    >
                        <div className="glass-panel rounded-2xl p-6 shadow-2xl relative">
                            <div className="flex items-center justify-between mb-6">
                                {title && (
                                    <h2 className="text-xl font-bold text-[#FBFAEE]">{title}</h2>
                                )}
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full hover:bg-white/10 text-[#FBFAEE]/60 hover:text-[#FBFAEE] transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
