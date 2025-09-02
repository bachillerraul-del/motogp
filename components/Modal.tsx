import React from 'react';
import { CloseIcon } from './Icons';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 transition-opacity duration-300"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div 
                className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md transform transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 id="modal-title" className="text-xl font-bold text-white">{title}</h2>
                    <button 
                        onClick={onClose} 
                        className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 transition-colors"
                        aria-label="Cerrar modal"
                    >
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};
