'use client';

import React from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Inline Button Component
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "ghost" | "gradient";
  size?: "default" | "sm" | "lg";
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "default", className = "", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer";

    const variants = {
      default: "bg-white text-black hover:bg-gray-100",
      secondary: "bg-gray-800 text-white hover:bg-gray-700",
      ghost: "hover:bg-gray-800/50 text-white",
      gradient:
        "bg-gradient-to-b from-white via-white/95 to-white/60 text-black hover:scale-105 active:scale-95 shadow-lg",
    };

    const sizes = {
      default: "h-10 px-4 py-2 text-sm",
      sm: "h-10 px-5 text-sm",
      lg: "h-12 px-8 text-base",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

// Navigation Component
export const Navigation = React.memo(
  ({
    brandName = "DataVai",
    showDashboardCta = true,
  }: {
    brandName?: string;
    showDashboardCta?: boolean;
  }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    return (
      <header className="fixed top-0 w-full z-50 border-b border-gray-800/50 bg-black/80 backdrop-blur-md">
        <nav className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-n3-accent,#ff7a2f)]" />
              <span>{brandName}</span>
            </Link>

            <div className="hidden md:flex items-center justify-center gap-8 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <a href="#getting-started" className="text-sm text-white/60 hover:text-white transition-colors">
                Getting started
              </a>
              <a href="#components" className="text-sm text-white/60 hover:text-white transition-colors">
                Components
              </a>
              <a href="#documentation" className="text-sm text-white/60 hover:text-white transition-colors">
                Documentation
              </a>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <Link href="/dashboard">
                <Button type="button" variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button type="button" variant="default" size="sm">
                  {showDashboardCta ? "Open Dashboard" : "Sign Up"}
                </Button>
              </Link>
            </div>

            <button
              type="button"
              className="md:hidden text-white cursor-pointer"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </nav>

        {mobileMenuOpen && (
          <div className="md:hidden bg-black/95 backdrop-blur-md border-t border-gray-800/50 animate-[slideDown_0.3s_ease-out]">
            <div className="px-6 py-4 flex flex-col gap-4">
              <a
                href="#getting-started"
                className="text-sm text-white/60 hover:text-white transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Getting started
              </a>
              <a
                href="#components"
                className="text-sm text-white/60 hover:text-white transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Components
              </a>
              <a
                href="#documentation"
                className="text-sm text-white/60 hover:text-white transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Documentation
              </a>
              <div className="flex flex-col gap-2 pt-4 border-t border-gray-800/50">
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button type="button" variant="ghost" size="sm" className="w-full justify-center">
                    Sign in
                  </Button>
                </Link>
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button type="button" variant="default" size="sm" className="w-full justify-center">
                    Open Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>
    );
  }
);

Navigation.displayName = "Navigation";

export interface SaaSHeroProps {
  pillText?: string;
  pillLink?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  ctaText?: string;
  ctaLink?: string;
  previewImage?: string;
  glowImage?: string;
  className?: string;
}

// Hero Component
export const Hero = React.memo(
  ({
    pillText = "New version of template is out!",
    pillLink = "#new-version",
    title = (
      <>
        Give your big idea <br />
        the website it deserves
      </>
    ),
    subtitle = (
      <>
        Landing page kit template with React, Shadcn/ui and Tailwind <br />
        that you can copy/paste into your project.
      </>
    ),
    ctaText = "Get started",
    ctaLink = "/dashboard",
    previewImage = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1600&auto=format&fit=crop",
    glowImage = "https://cdn.21st.dev/assets/mirror/ab/abe6d8090cc14780b846eee062024e4e03274c99d38188554239cd312a7180fa.png",
    className = "",
  }: SaaSHeroProps) => {
    return (
      <section
        className={cn(
          "relative min-h-screen flex flex-col items-center justify-start px-6 py-20 md:py-24 overflow-hidden",
          className
        )}
        style={{
          animation: "fadeIn 0.6s ease-out",
        }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
          
          .saas-template-root {
            font-family: 'Poppins', ui-sans-serif, system-ui, sans-serif;
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>

        <aside className="mb-8 inline-flex flex-wrap items-center justify-center gap-2 px-4 py-2 rounded-full border border-gray-700 bg-gray-800/50 backdrop-blur-sm max-w-full">
          <span className="text-xs text-center whitespace-nowrap text-gray-400">
            {pillText}
          </span>
          <a
            href={pillLink}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-all active:scale-95 whitespace-nowrap"
            aria-label="Read more about the announcement"
          >
            Read more
            <ArrowRight size={12} />
          </a>
        </aside>

        <h1
          className="text-4xl md:text-5xl lg:text-6xl font-medium text-center max-w-3xl px-6 leading-tight mb-6"
          style={{
            background: "linear-gradient(to bottom, #ffffff, #ffffff, rgba(255, 255, 255, 0.6))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            letterSpacing: "-0.05em",
          }}
        >
          {title}
        </h1>

        <p className="text-sm md:text-base text-center max-w-2xl px-6 mb-10 text-gray-400 leading-relaxed">
          {subtitle}
        </p>

        <div className="flex items-center gap-4 relative z-10 mb-16">
          <Link href={ctaLink}>
            <Button
              type="button"
              variant="gradient"
              size="lg"
              className="rounded-lg flex items-center justify-center"
              aria-label="Get started with the template"
            >
              {ctaText}
            </Button>
          </Link>
        </div>

        <div className="w-full max-w-5xl relative pb-20">
          <div
            className="absolute left-1/2 w-[90%] pointer-events-none z-0"
            style={{
              top: "-23%",
              transform: "translateX(-50%)",
            }}
            aria-hidden="true"
          >
            {/* Ambient visual aura */}
            <img
              src={glowImage}
              alt=""
              className="w-full h-auto opacity-70"
              loading="eager"
              onError={(e) => {
                // Graceful fallback if external CDN is blocked
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
          </div>

          <div className="relative z-10 rounded-xl overflow-hidden shadow-2xl border border-gray-800 bg-gray-950/80">
            <img
              src={previewImage}
              alt="Dashboard preview showing analytics and metrics interface"
              className="w-full h-auto rounded-lg shadow-2xl object-cover"
              loading="eager"
            />
          </div>
        </div>
      </section>
    );
  }
);

Hero.displayName = "Hero";

export interface SaaSTemplateProps {
  showNavigation?: boolean;
  heroProps?: SaaSHeroProps;
}

// Main Component
export default function Component({ showNavigation = true, heroProps = {} }: SaaSTemplateProps) {
  return (
    <main className="saas-template-root min-h-screen bg-black text-white antialiased">
      {showNavigation && <Navigation />}
      <Hero {...heroProps} />
    </main>
  );
}

export { Component as SaaSTemplate };
