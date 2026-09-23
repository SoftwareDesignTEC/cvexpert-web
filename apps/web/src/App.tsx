import { ThemeProvider } from './context/ThemeContext';

// App solo provee el ThemeProvider global
// El layout (sidebar + header) vive en MainLayout
// Las páginas se renderizan a través del router en main.tsx
export default function App({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            {children}
        </ThemeProvider>
    );
}
