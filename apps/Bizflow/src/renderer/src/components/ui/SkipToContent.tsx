/**
 * SkipToContent Component
 * Provides keyboard navigation shortcut for screen readers
 * Allows users to skip directly to main content
 */

export default function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-6 focus:py-3 focus:bg-primary focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all"
      tabIndex={0}
    >
      Skip to main content
    </a>
  )
}
