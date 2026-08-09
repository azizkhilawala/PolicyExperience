import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Banner
          status="error"
          container="section"
          title="Something went wrong"
          description={this.state.error?.message ?? 'An unexpected error occurred.'}
          endContent={
            <Button label="Reload page" variant="secondary" size="sm" onClick={this.handleReload} />
          }
        />
      );
    }

    return this.props.children;
  }
}
