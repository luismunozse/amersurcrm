"use client";

import { createContext, useContext, type ReactNode } from "react";

type UserProfileContextValue = {
  avatarUrl: string | null;
  setAvatarUrl: (url: string | null) => void;
};

const UserProfileContext = createContext<UserProfileContextValue | undefined>(undefined);

type ProviderProps = {
  value: UserProfileContextValue;
  children: ReactNode;
};

export function UserProfileProvider({ value, children }: ProviderProps) {
  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfileContext() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) {
    throw new Error("useUserProfileContext must be used within a UserProfileProvider");
  }
  return ctx;
}

export function useOptionalUserProfileContext() {
  return useContext(UserProfileContext);
}
