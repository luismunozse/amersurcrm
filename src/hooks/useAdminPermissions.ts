"use client";

import { useState, useEffect } from 'react';

interface AdminPermissions {
  isAdmin: boolean;
  loading: boolean;
  canCreateProjects: boolean;
  canCreateProperties: boolean;
  canManageUsers: boolean;
}

export function useAdminPermissions(): AdminPermissions {
  const [permissions, setPermissions] = useState<AdminPermissions>({
    isAdmin: false,
    loading: true,
    canCreateProjects: false,
    canCreateProperties: false,
    canManageUsers: false,
  });

  useEffect(() => {
    async function checkPermissions() {
      try {
        const response = await fetch('/api/auth/check-admin');
        const data = await response.json();
        
        setPermissions({
          isAdmin: data.isAdmin || false,
          loading: false,
          canCreateProjects: data.isAdmin || false,
          canCreateProperties: data.isAdmin || false,
          canManageUsers: data.isAdmin || false,
        });
      } catch (error) {
        console.error('Error checking admin permissions:', error);
        setPermissions({
          isAdmin: false,
          loading: false,
          canCreateProjects: false,
          canCreateProperties: false,
          canManageUsers: false,
        });
      }
    }

    checkPermissions();
  }, []);

  return permissions;
}
