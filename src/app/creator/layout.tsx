import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Truleado – Creator Portal',
  description: 'Manage your campaigns and deliverables',
}

export default function CreatorPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
