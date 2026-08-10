import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'

/** The shared shell every `/admin/*` page renders inside — sidebar, top
 * navigation, breadcrumbs — per Step 52's "professional responsive admin
 * layout" requirement. Entirely isolated to this app (`admin/`), so it can
 * never affect the Student Web App's own layout/routing. */
export function AdminLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-svh">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <div className="mb-4">
            <Breadcrumbs />
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
