'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { ProposalAuthGate } from '@/components/creator/ProposalAuthGate';

interface Props {
  params: { proposalId: string };
  searchParams: { email?: string };
}

export default function ProposalPage({ params, searchParams }: Props) {
  const { proposalId } = params;
  const { email } = searchParams;
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace(`/creator/proposals/${proposalId}`);
    }
  }, [loading, user, router, proposalId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (user) {
    // Will redirect via useEffect
    return null;
  }

  return (
    <ProposalAuthGate
      proposalId={proposalId}
      initialEmail={email ?? ''}
    />
  );
}
