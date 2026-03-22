import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  showError(message: string) {
    window.alert(message);
  }

  showSuccess(message: string) {
    window.alert(message);
  }

  confirm(message: string) {
    return window.confirm(message);
  }
}
