import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/ui/Sidebar';
import Header from '../components/ui/Header';

export default function MainLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden">

            {/* Overlay oscuro cuando el sidebar está abierto */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-10"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar — se desliza desde la izquierda */}
            <div className={`fixed top-0 left-0 h-full z-20 transition-transform duration-300 ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
                <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>

            {/* Área principal */}
            <div className="flex flex-col flex-1 overflow-hidden">
                <Header onMenuClick={() => setSidebarOpen(prev => !prev)} />
                <main className="flex-1 overflow-y-auto p-6">
                    <Outlet />
                </main>
            </div>

        </div>
    );
}
