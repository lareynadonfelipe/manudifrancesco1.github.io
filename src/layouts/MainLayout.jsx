// MainLayout.jsx
import Navbar from '@/components/Navbar'
import Sidebar from '@/components/Sidebar'

export default function MainLayout({ children }) {
  return (
    // 1) Contenedor full width y full height
    <div className="flex h-screen w-full bg-gray-50">
      {/* 2) Sidebar fijo a la izquierda */}
      <aside className="flex-shrink-0">
        <Sidebar />
      </aside>

      {/* 3) Área de contenido: crece, full width */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-auto p-4">
          {children}
        </main>
      </div>
    </div>
  )
}
