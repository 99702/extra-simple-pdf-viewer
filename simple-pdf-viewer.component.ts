import {
  Component, Input, Output, EventEmitter, ElementRef, ViewChild,
  OnChanges, SimpleChanges, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-simple-pdf-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
  template: `
    <div #pdfContainer class="relative w-full flex flex-col border border-gray-300 rounded-md shadow-sm overflow-hidden"
         [style.height]="height">

      <div class="flex items-center justify-between px-4 py-2 bg-[#323639] border-b border-[#202224] shadow-md z-10">
        <div class="text-[13px] font-medium text-gray-200 truncate max-w-[50%] tracking-wide">
          {{ filenameForDownload || 'Document Viewer' }}
        </div>

        <div class="flex items-center gap-1.5">
          <button (click)="downloadPdf()" [disabled]="isLoading || !objectUrl" title="Download"
                  class="p-1.5 text-gray-300 rounded hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2"
                 stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"/>
            </svg>
          </button>

          <button (click)="printPdf()" [disabled]="isLoading || !objectUrl" title="Print"
                  class="p-1.5 text-gray-300 rounded hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2"
                 stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round"
                    d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0v2.796c0 .358.29.649.649.649h9.202c.359 0 .649-.29.649-.649V6.75z"/>
            </svg>
          </button>

          <div class="h-5 w-px bg-gray-600 mx-1"></div>

          <button (click)="toggleFullScreen()" [disabled]="isLoading || !objectUrl"
                  [title]="isFullScreen ? 'Exit Full Screen' : 'Full Screen'"
                  class="p-1.5 text-gray-300 rounded hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">

            @if (!isFullScreen) {
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                   stroke-width="2" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"/>
              </svg>
            } @else {
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                   stroke-width="2" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25"/>
              </svg>
            }
          </button>
        </div>
      </div>

      @if (isLoading) {
        <div class="absolute inset-0 top-[44px] flex items-center justify-center bg-[#525659] z-10">
          <div class="flex flex-col items-center">
            <span class="mb-3">Loading......</span>
            <span class="text-sm font-medium text-gray-200 tracking-wide">Loading PDF...</span>
          </div>
        </div>
      }

      @if (safePdfUrl) {
        <iframe #pdfIframe [src]="safePdfUrl" class="w-full flex-1 bg-[#525659]"
                title="PDF Viewer"></iframe>
      }
    </div>
  `
})
export class SimplePdfViewerComponent implements OnChanges, OnDestroy {
  @Input() src!: string;
  @Input() filenameForDownload: string = 'document.pdf';
  @Input() httpHeaders: any;
  @Input() height: string = '600px';

  @Output() pdfLoadingStarts = new EventEmitter<void>();
  @Output() pdfLoaded = new EventEmitter<void>();

  @ViewChild('pdfContainer', { static: false }) container!: ElementRef<HTMLDivElement>;
  @ViewChild('pdfIframe', { static: false }) iframe!: ElementRef<HTMLIFrameElement>;

  safePdfUrl: SafeResourceUrl | null = null;
  isLoading: boolean = false;
  isFullScreen: boolean = false;
  objectUrl: string | null = null;

  private httpSubscription!: Subscription;

  constructor(
    private sanitizer: DomSanitizer,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['src'] && this.src) {
      this.loadPdf();
    }
  }

  ngOnDestroy(): void {
    this.cleanUpResources();
  }

  private cleanUpResources(): void {
    if (this.httpSubscription) {
      this.httpSubscription.unsubscribe();
    }
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
    }
  }

  private loadPdf(): void {
    this.pdfLoadingStarts.emit();
    this.isLoading = true;
    this.cdr.markForCheck();

    this.cleanUpResources();

    const options: any = { responseType: 'blob' as const };

    if (this.httpHeaders) {
      options.headers = this.httpHeaders;
    }

    this.httpSubscription = this.http.get(this.src, options).subscribe(
      (blob: any) => {
        this.objectUrl = URL.createObjectURL(blob);
        const urlWithParams = `${this.objectUrl}#toolbar=0&navpanes=0&scrollbar=1`;
        this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(urlWithParams);

        this.isLoading = false;
        this.pdfLoaded.emit();
        this.cdr.markForCheck();
      },
      (err: any) => {
        console.error('Failed to load PDF', err);
        this.isLoading = false;
        this.pdfLoaded.emit();
        this.cdr.markForCheck();
      }
    );
  }

  downloadPdf(): void {
    if (!this.objectUrl) return;
    const a = document.createElement('a');
    a.href = this.objectUrl;
    a.download = this.filenameForDownload || 'download.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  printPdf(): void {
    if (this.iframe && this.iframe.nativeElement.contentWindow) {
      this.iframe.nativeElement.contentWindow.print();
    }
  }

  toggleFullScreen(): void {
    const elem = this.container.nativeElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().then(() => {
        this.isFullScreen = true;
        this.cdr.markForCheck();
      });
    } else {
      document.exitFullscreen().then(() => {
        this.isFullScreen = false;
        this.cdr.markForCheck();
      });
    }
  }
}
