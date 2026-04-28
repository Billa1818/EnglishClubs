"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground">
          <div>
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-foreground/20 text-xl font-bold">
                EC
              </div>
              <span className="text-2xl font-bold">English Club</span>
            </Link>
          </div>

          <div className="space-y-6">
            <blockquote className="text-2xl font-medium leading-relaxed text-balance">
              &quot;Rejoignez notre communaute et ameliorez votre anglais dans une ambiance conviviale et bienveillante.&quot;
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary-foreground/20" />
              <div>
                <p className="font-semibold">Jean Dupont</p>
                <p className="text-sm text-primary-foreground/80">Fondateur, English Club</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-8 text-sm">
              <div>
                <p className="text-3xl font-bold">50+</p>
                <p className="text-primary-foreground/80">Membres actifs</p>
              </div>
              <div>
                <p className="text-3xl font-bold">200+</p>
                <p className="text-primary-foreground/80">Seances organisees</p>
              </div>
              <div>
                <p className="text-3xl font-bold">95%</p>
                <p className="text-primary-foreground/80">Taux de satisfaction</p>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary-foreground/10" />
        <div className="absolute -top-16 -left-16 h-64 w-64 rounded-full bg-primary-foreground/5" />
      </div>

      {/* Right side - Auth form */}
      <div className="flex flex-1 flex-col">
        {/* Mobile header */}
        <div className="lg:hidden p-4 border-b border-border">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              EC
            </div>
            <span className="text-lg font-bold text-foreground">English Club</span>
          </Link>
        </div>

        {/* Form container */}
        <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">{children}</div>
        </div>

        {/* Footer */}
        <div className="p-6 text-center text-sm text-muted-foreground">
          <p>
            En continuant, vous acceptez nos{" "}
            <Link href="#" className="underline hover:text-foreground">
              Conditions d&apos;utilisation
            </Link>{" "}
            et notre{" "}
            <Link href="#" className="underline hover:text-foreground">
              Politique de confidentialite
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
