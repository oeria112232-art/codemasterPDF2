import * as React from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeProviderState {
    theme: Theme
    setTheme: (theme: Theme) => void
}

const ThemeProviderContext = React.createContext<ThemeProviderState>({
    theme: 'system',
    setTheme: () => null,
})

export function ThemeProvider({ children, defaultTheme = 'system' }: { children: React.ReactNode; defaultTheme?: Theme }) {
    const [theme, setTheme] = React.useState<Theme>(
        () => (localStorage.getItem('theme') as Theme) || defaultTheme
    )

    React.useEffect(() => {
        const root = window.document.documentElement
        root.classList.remove('light', 'dark')

        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
            root.classList.add(systemTheme)
        } else {
            root.classList.add(theme)
        }

        localStorage.setItem('theme', theme)
    }, [theme])

    const value = { theme, setTheme }

    return (
        <ThemeProviderContext.Provider value={value}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

export const useTheme = () => React.useContext(ThemeProviderContext)
