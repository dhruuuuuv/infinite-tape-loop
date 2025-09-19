// Progressive Image Loading with Intersection Observer
class ProgressiveImageLoader {
    constructor() {
        this.imageObserver = null;
        this.init();
    }

    init() {
        // Check if Intersection Observer is supported
        if ('IntersectionObserver' in window) {
            this.setupIntersectionObserver();
        } else {
            // Fallback for older browsers
            this.loadAllImages();
        }

        // Handle images that are already in viewport on page load
        this.handleInitialVisibleImages();

        // Listen for dynamic content changes
        this.observeMutations();
    }

    setupIntersectionObserver() {
        const options = {
            root: null,
            rootMargin: '50px 0px', // Start loading 50px before entering viewport
            threshold: 0.01
        };

        this.imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                    this.imageObserver.unobserve(entry.target);
                }
            });
        }, options);

        // Start observing all lazy images
        this.observeImages();
    }

    observeImages() {
        const lazyImages = document.querySelectorAll('.main-image[loading="lazy"]:not(.loaded)');
        lazyImages.forEach(img => {
            if (!img.classList.contains('observed')) {
                this.imageObserver.observe(img);
                img.classList.add('observed');
            }
        });
    }

    loadImage(img) {
        const wrapper = img.closest('.progressive-image-wrapper');
        const placeholder = wrapper?.querySelector('.placeholder-image');

        // Set up loading state
        if (wrapper) {
            wrapper.classList.add('loading');
        }

        // Create a new image to preload
        const imageLoader = new Image();

        imageLoader.onload = () => {
            // Image loaded successfully
            img.src = imageLoader.src;
            img.classList.add('loaded');

            if (wrapper) {
                wrapper.classList.remove('loading');
                wrapper.classList.add('loaded');
            }

            // Fade out placeholder
            if (placeholder) {
                placeholder.style.opacity = '0';
                setTimeout(() => {
                    placeholder.style.display = 'none';
                }, 300);
            }

            // Trigger custom event
            img.dispatchEvent(new CustomEvent('imageLoaded', {
                bubbles: true,
                detail: { src: imageLoader.src }
            }));
        };

        imageLoader.onerror = () => {
            // Handle loading error
            this.handleImageError(img, wrapper, placeholder);
        };

        // Start loading
        const src = img.dataset.src || img.src;
        if (src && src !== img.src) {
            imageLoader.src = src;
        } else {
            // Image is already loaded or no data-src
            img.classList.add('loaded');
            if (wrapper) {
                wrapper.classList.add('loaded');
            }
        }
    }

    handleImageError(img, wrapper, placeholder) {
        console.warn('Failed to load image:', img.dataset.src || img.src);

        // Try fallback src if available
        const fallbackSrc = img.dataset.fallback;
        if (fallbackSrc && fallbackSrc !== img.src) {
            img.src = fallbackSrc;
            return;
        }

        // Mark as error and show placeholder or error state
        img.classList.add('error', 'loaded');
        if (wrapper) {
            wrapper.classList.remove('loading');
            wrapper.classList.add('error');
        }

        // Keep placeholder visible for error state
        if (placeholder) {
            placeholder.style.opacity = '0.3';
            placeholder.style.filter = 'blur(5px) grayscale(1)';
        }

        // Trigger custom event
        img.dispatchEvent(new CustomEvent('imageError', {
            bubbles: true,
            detail: { src: img.dataset.src || img.src }
        }));
    }

    handleInitialVisibleImages() {
        // Handle images that might be immediately visible
        const visibleImages = document.querySelectorAll('.main-image:not(.loaded)');
        visibleImages.forEach(img => {
            const rect = img.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

            if (isVisible) {
                this.loadImage(img);
            }
        });
    }

    loadAllImages() {
        // Fallback for browsers without Intersection Observer
        const allImages = document.querySelectorAll('.main-image:not(.loaded)');
        allImages.forEach(img => this.loadImage(img));
    }

    observeMutations() {
        // Watch for dynamically added images
        if ('MutationObserver' in window) {
            const mutationObserver = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element node
                            const newImages = node.querySelectorAll?.('.main-image[loading="lazy"]:not(.loaded)') || [];
                            newImages.forEach(img => {
                                if (this.imageObserver) {
                                    this.imageObserver.observe(img);
                                    img.classList.add('observed');
                                } else {
                                    this.loadImage(img);
                                }
                            });
                        }
                    });
                });
            });

            mutationObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    // Public methods for manual control
    forceLoad(selector) {
        const images = document.querySelectorAll(selector);
        images.forEach(img => this.loadImage(img));
    }

    refresh() {
        if (this.imageObserver) {
            this.observeImages();
        } else {
            this.loadAllImages();
        }
    }
}

// Image format detection and optimization
class ImageOptimizer {
    constructor() {
        this.supportsWebP = false;
        this.supportsAVIF = false;
        this.detectFormats();
    }

    detectFormats() {
        // Test WebP support
        const webp = new Image();
        webp.onload = webp.onerror = () => {
            this.supportsWebP = (webp.height === 2);
            document.documentElement.classList.toggle('webp', this.supportsWebP);
            document.documentElement.classList.toggle('no-webp', !this.supportsWebP);
        };
        webp.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';

        // Test AVIF support
        const avif = new Image();
        avif.onload = avif.onerror = () => {
            this.supportsAVIF = (avif.height === 2);
            document.documentElement.classList.toggle('avif', this.supportsAVIF);
        };
        avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAQAAAAEAAAAQcGl4aQAAAAADCAgIAAAAFmF1eEMAAAAAdXJuOm1wZWc6bXBlZ0I6Y2ljcAAAAAA=';
    }
}

// Performance monitoring
class ImagePerformanceMonitor {
    constructor() {
        this.metrics = {
            totalImages: 0,
            loadedImages: 0,
            errorImages: 0,
            loadTimes: []
        };

        this.init();
    }

    init() {
        // Listen for image events
        document.addEventListener('imageLoaded', (e) => {
            this.metrics.loadedImages++;
            this.recordLoadTime(e.target);
        });

        document.addEventListener('imageError', (e) => {
            this.metrics.errorImages++;
            console.warn('Image failed to load:', e.detail.src);
        });

        // Count total images on page
        this.metrics.totalImages = document.querySelectorAll('img').length;
    }

    recordLoadTime(img) {
        if ('performance' in window && performance.getEntriesByName) {
            const entries = performance.getEntriesByName(img.src);
            if (entries.length > 0) {
                const loadTime = entries[entries.length - 1].loadEventEnd - entries[entries.length - 1].startTime;
                this.metrics.loadTimes.push(loadTime);
            }
        }
    }

    getStats() {
        const avgLoadTime = this.metrics.loadTimes.length > 0
            ? this.metrics.loadTimes.reduce((a, b) => a + b, 0) / this.metrics.loadTimes.length
            : 0;

        return {
            ...this.metrics,
            successRate: this.metrics.totalImages > 0 ? (this.metrics.loadedImages / this.metrics.totalImages) * 100 : 0,
            averageLoadTime: avgLoadTime
        };
    }
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReducedMotion) {
        // Initialize progressive loading
        window.progressiveImageLoader = new ProgressiveImageLoader();

        // Initialize image optimization
        window.imageOptimizer = new ImageOptimizer();

        // Initialize performance monitoring (only in development)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            window.imagePerformanceMonitor = new ImagePerformanceMonitor();

            // Log stats after 5 seconds
            setTimeout(() => {
                console.log('Image Loading Stats:', window.imagePerformanceMonitor.getStats());
            }, 5000);
        }
    } else {
        // For users who prefer reduced motion, just load images normally
        document.querySelectorAll('.main-image').forEach(img => {
            img.classList.add('loaded');
            const placeholder = img.previousElementSibling;
            if (placeholder && placeholder.classList.contains('placeholder-image')) {
                placeholder.style.display = 'none';
            }
        });
    }
});

// Expose API for manual control
window.imageLoader = {
    forceLoad: (selector) => window.progressiveImageLoader?.forceLoad(selector),
    refresh: () => window.progressiveImageLoader?.refresh(),
    getStats: () => window.imagePerformanceMonitor?.getStats()
};
