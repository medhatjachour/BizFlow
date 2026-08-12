/**
 * SkipToContent Component
 * Provides keyboard navigation shortcut for screen readers
 * Allows users to skip directly to main content
 */

export default function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="fixed left-4 top-4 z-[60] -translate-y-24 opacity-0 pointer-events-none px-6 py-3 bg-primary text-white rounded-lg shadow-lg outline-none ring-2 ring-primary ring-offset-2 transition-all focus:translate-y-0 focus:opacity-100 focus:pointer-events-auto"
      tabIndex={0}
    >
      Skip to main content
    </a>
  )
}
