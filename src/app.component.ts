
import { Component, effect, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from './core/layout/sidebar.component';
import { NotificationCenterComponent } from './core/ui/notification-center.component';
import { StateService } from './services/state.service';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, NotificationCenterComponent, CommonModule],
  template: `
    <!-- Global Background Wrapper -->
    <div class="relative flex h-screen overflow-hidden font-sans text-gray-100 selection:bg-primary selection:text-white global-bg">
      
      <!-- Shared Background Effects (Orbs & Grid) -->
      <div class="fixed inset-0 z-0 pointer-events-none overflow-hidden">
         <div class="orb orb-1"></div>
         <div class="orb orb-2"></div>
         <div class="orb orb-3"></div>
      </div>

      <!-- Sidebar (Glass Layer) -->
      @if (state.isLoggedIn() && showSidebar) {
        <app-sidebar class="flex-shrink-0 relative z-30 transition-all duration-300"></app-sidebar>
      }

      <!-- Main Content Area -->
      <main class="flex-1 overflow-auto relative transition-all duration-300 flex flex-col">
        <router-outlet></router-outlet>
      </main>

      <app-notification-center></app-notification-center>

    </div>
  `,
  styles: [`
    .global-bg {
        background-color: #080c14;
        background-image: 
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
        background-size: 50px 50px;
    }
    .orb {
        position: absolute;
        border-radius: 50%;
        filter: blur(80px);
        z-index: 0;
        opacity: 0.4;
        pointer-events: none;
    }
    /* Orb positions matching the reference design */
    .orb-1 { top: -10%; left: -5%; width: 400px; height: 400px; background: #2563EB; }
    .orb-2 { top: 40%; left: -10%; width: 300px; height: 300px; background: #4f46e5; }
    .orb-3 { bottom: -10%; left: 0%; width: 350px; height: 350px; background: #06b6d4; }
  `]
})
export class AppComponent {
  state = inject(StateService);
  router: Router = inject(Router);
  showSidebar = true;

  constructor() {
    effect(() => {
      if (!this.state.sessionExpired()) return;
      void this.state.logout();
      this.state.redirectToLogin();
    });

    this.updateSidebarVisibility(this.router.url);

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.updateSidebarVisibility(event.urlAfterRedirects);
    });
  }

  private updateSidebarVisibility(url: string) {
    this.showSidebar = !(url.includes('/login') || url.includes('/mode-selector') || url.includes('/operator'));
  }
}
