import { Component, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { MessageCircle, RefreshCw, ArrowLeft } from "lucide-react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ChatErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ChatErrorBoundary]", error, info.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] px-6 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 mb-5">
            <MessageCircle size={28} className="text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Something went wrong loading chat</h2>
          <p className="text-sm text-[#6B6B80] text-center mb-6 max-w-sm">
            An unexpected error occurred. Please try again or go back.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 rounded-xl bg-[#4F6EF7] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#4F6EF7]/90 transition-all"
            >
              <RefreshCw size={15} />
              Retry
            </button>
            <Link
              to="/dashboard"
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-5 py-2.5 text-sm font-medium text-[#B0B0C0] hover:text-white hover:bg-white/[0.04] transition-all"
            >
              <ArrowLeft size={15} />
              Back to dashboard
            </Link>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
