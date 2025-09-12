import React, { useEffect, useState } from 'react';

interface ToastProps {
    // FIX: Added 'info' to the toast types to support informational messages.
    toast: { id: number; message: string; type: 'success' | 'error' | 'info' } | null;
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (toast) {
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
                // Allow for fade-out animation before calling onClose
                setTimeout(onClose, 300);
            }, 3000); // Toast disappears after 3 seconds

            return () => clearTimeout(timer);
        }
    }, [toast, onClose]);

    if (!toast) {
        return null;
    }

    const baseClasses = "fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white transition-all duration-300 ease-in-out z-50";
    // FIX: Added style for the 'info' toast type.
    const typeClasses = {
        success: "bg-green-500",
        error: "bg-red-600",
        info: "bg-blue-500",
    };
    const visibilityClasses = visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10";

    return (
        <div 
            className={`${baseClasses} ${typeClasses[toast.type]} ${visibilityClasses}`}
            role="alert"
            aria-live="assertive"
        >
            {toast.message}
        </div>
    );
};
