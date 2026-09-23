import { Outlet } from 'react-router-dom';
import Sidebar from '../components/ui/Sidebar';
import Header from '../components/ui/Header';

export default function MainLayout() {
    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-950 overflow-hidden">
            {/* Sidebar fijo a la izquierda */}
            <Sidebar />

            {/* Área principal */}
            <div className="flex flex-col flex-1 overflow-hidden">
                <Header />

                {/* Contenido de cada página */}
                <main className="flex-1 overflow-y-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
