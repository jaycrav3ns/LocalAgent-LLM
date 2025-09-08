import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import FileManager from '@/components/ui/FileManager';

export default function UserFilesDisplay() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return (
    <>
      <FileManager
        title="User Files"
        baseEndpoint="/api/user-files"
        uploadEndpoint="/api/user-files/upload"
        className="h-full"
      />
    </>
  );
}
