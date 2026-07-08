import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	safelist: [
		'bg-orange-50', 'text-orange-900', 'border-orange-500', 'hover:bg-orange-100',
		'bg-red-50', 'text-red-900', 'border-red-500', 'hover:bg-red-100',
		'bg-yellow-50', 'text-yellow-900', 'border-yellow-500', 'hover:bg-yellow-100',
		'bg-green-50', 'text-green-900', 'border-green-500', 'hover:bg-green-100',
		'bg-blue-50', 'text-blue-900', 'border-blue-500', 'hover:bg-blue-100',
		'bg-purple-50', 'text-purple-900', 'border-purple-500', 'hover:bg-purple-100',
		'bg-red-100', 'text-red-600',
		'bg-orange-100', 'text-orange-600',
		'bg-yellow-100', 'text-yellow-600',
		'bg-green-100', 'text-green-600',
		'bg-blue-100', 'text-blue-600',
		'bg-purple-100', 'text-purple-600',
	],
	prefix: "",
	theme: {
		fontFamily:{
			recursive: ['Recursive', "sans-serif"]
		},
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				aws: {
					'blue': '#232F3E',
					'light-blue': '#1A73E8',
					'orange': '#FF9900',
					'dark': '#121212',
					'light': '#F9F9F9',
					'gray': '#E6E6E6'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					from: {
						opacity: '0'
					},
					to: {
						opacity: '1'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.5s ease-in-out'
			}
		}
	},
	plugins: [
		tailwindcssAnimate,
	],
} satisfies Config;