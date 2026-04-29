'use client';

import { AuthContextProvider } from '@/context/AuthContext';
import { ToastContextProvider } from '@/context/ToastContext';
import { ToastViewport } from './Toast';

/**
 * Thin client wrapper that mounts AuthContext + ToastContext + Toast viewport.
 * Imported by the root server layout.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthContextProvider>
      <ToastContextProvider>
        {children}
        <ToastViewport />
      </ToastContextProvider>
    </AuthContextProvider>
  );
}
