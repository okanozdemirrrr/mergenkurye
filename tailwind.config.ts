import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // CSS değişkenlerini okuyarak merkezi yönetimi sağlar
                brand: {
                    primary: "var(--brand-primary)",
                    secondary: "var(--brand-secondary)",
                },
                slate: {
                    50: "var(--slate-50)",
                    100: "var(--slate-100)",
                    200: "var(--slate-200)",
                    300: "var(--slate-300)",
                    400: "var(--slate-400)",
                    500: "var(--slate-500)",
                    600: "var(--slate-600)",
                    700: "var(--slate-700)",
                    800: "var(--slate-800)",
                    900: "var(--slate-900)",
                    950: "var(--slate-950)",
                },
                blue: {
                    50: "var(--blue-50)",
                    100: "var(--blue-100)",
                    200: "var(--blue-200)",
                    300: "var(--blue-300)",
                    400: "var(--blue-400)",
                    500: "var(--blue-500)",
                    600: "var(--blue-600)",
                    700: "var(--blue-700)",
                    800: "var(--blue-800)",
                    900: "var(--blue-900)",
                },
                green: {
                    50: "var(--green-50)",
                    100: "var(--green-100)",
                    200: "var(--green-200)",
                    300: "var(--green-300)",
                    400: "var(--green-400)",
                    500: "var(--green-500)",
                    600: "var(--green-600)",
                    700: "var(--green-700)",
                    800: "var(--green-800)",
                    900: "var(--green-900)",
                },
            },
            fontFamily: {
                sans: ["var(--font-sans)"],
                mono: ["var(--font-mono)"],
            },
            borderRadius: {
                sm: "var(--radius-sm)",
                md: "var(--radius-md)",
                lg: "var(--radius-lg)",
                xl: "var(--radius-xl)",
                "2xl": "var(--radius-2xl)",
            },
            boxShadow: {
                sm: "var(--shadow-sm)",
                md: "var(--shadow-md)",
                lg: "var(--shadow-lg)",
                xl: "var(--shadow-xl)",
                "2xl": "var(--shadow-2xl)",
            },
            spacing: {
                1: "var(--space-1)",
                2: "var(--space-2)",
                3: "var(--space-3)",
                4: "var(--space-4)",
                5: "var(--space-5)",
                6: "var(--space-6)",
                8: "var(--space-8)",
                10: "var(--space-10)",
                12: "var(--space-12)",
                16: "var(--space-16)",
                20: "var(--space-20)",
                24: "var(--space-24)",
            },
            // Logo ayarları
            opacity: {
                logo: "var(--logo-opacity)",
            },
        },
    },
    plugins: [],
};

export default config;
