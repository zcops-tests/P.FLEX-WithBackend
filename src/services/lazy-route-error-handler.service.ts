import { ErrorHandler, Injectable } from '@angular/core';

@Injectable()
export class LazyRouteErrorHandlerService implements ErrorHandler {
  private readonly reloadMarkerKey = 'pflex_lazy_route_reload_marker';

  handleError(error: unknown): void {
    if (this.tryRecoverLazyImportFailure(error)) {
      return;
    }

    console.error(error);
  }

  private tryRecoverLazyImportFailure(error: unknown) {
    const message = this.extractMessage(error);
    const isLazyImportFailure =
      message.includes('Failed to fetch dynamically imported module') ||
      message.includes('Importing a module script failed') ||
      message.includes('Loading chunk');

    if (!isLazyImportFailure || typeof window === 'undefined') {
      return false;
    }

    const currentLocation = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const previousMarker = window.sessionStorage.getItem(this.reloadMarkerKey);

    if (previousMarker === currentLocation) {
      window.sessionStorage.removeItem(this.reloadMarkerKey);
      console.error(error);
      return false;
    }

    window.sessionStorage.setItem(this.reloadMarkerKey, currentLocation);
    window.location.reload();
    return true;
  }

  private extractMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof (error as { message?: unknown }).message === 'string'
    ) {
      return String((error as { message?: string }).message || '');
    }

    return String(error || '');
  }
}
