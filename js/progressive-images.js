// Enhanced Progressive Image Loading with Skeleton Loader
class SkeletonImageLoader {
    constructor() {
        this.imageObserver = null;
        this.loadedImages = new Set();
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

        // Add global image event listeners
        this.addGlobalEventListeners();
    }

    setupIntersectionObserver() {
        const options = {
            root: null,
            rootMargin: '100px 0px', // Start loading 100px before entering viewport
            threshold: 0.01
        };

        this.imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (!this.loadedImages.has(img)) {
                        this.loadImage(img);
                    }
                    this.imageObserver.unobserve(img);
                }
            });
        }, options);

        // Start observing all lazy images
        this.observeImages();
    }

    observeImages() {
        const lazyImages = document.querySelectorAll('.main-image[loading="lazy"]:not(.loaded)');
        lazyImages.forEach(img => {
            if (!img.hasAttribute('data-observed')) {
                this.imageObserver.observe(img);
                img.setAttribute('data-observed', 'true');
            }
        });
    }

    loadImage(img) {
        const wrapper = img.closest('.progressive-image-wrapper');
        const figure = img.closest('.image-figure');

        if (this.loadedImages.has(img)) return;

        // Mark as loading
        if (wrapper) {
            wrapper.setAttribute('data-loading', 'true');
        }

        // Add load event listener
        img.addEventListener('load', () => this.handleImageLoad(img), { once: true });
        img.addEventListener('error', () => this.handleImageError(img), { once: true });

        // If image is already cached, it might load immediately
        if (img.complete && img.naturalHeight !== 0) {
            this.handleImageLoad(img);
        }
    }

    handleImageLoad(img) {
        const wrapper = img.closest('.progressive-image-wrapper');
        const figure = img.closest('.image-figure');
        const skeleton = wrapper?.querySelector('.skeleton-loader');
        const placeholder = wrapper?.querySelector('.blur-placeholder');

        // Mark as loaded
        this.loadedImages.add(img);

        // Add loaded class with slight delay for smooth transition
        setTimeout(() => {
            img.classList.add('loaded');
            if (wrapper) {
                wrapper.classList.add('loaded');
                wrapper.setAttribute('data-loading', 'false');
            }
            if (figure) {
                figure.setAttribute('data-loading', 'false');
            }

            // Hide skeleton with animation
            if (skeleton) {
                skeleton.style.opacity = '0';
                setTimeout(() => {
                    skeleton.style.display = 'none';
                }, 300);
            }

            // Hide placeholder with animation
            if (placeholder) {
                placeholder.style.opacity = '0';
                setTimeout(() => {
                    placeholder.style.display = 'none';
                }, 400);
            }

            // Trigger custom event
            img.dispatchEvent(new CustomEvent('imageLoaded', {
                bubbles: true,
                detail: { src: img.src }
            }));

        }, 50); // Small delay to ensure smooth transition
    }

    handleImageError(img) {
        const wrapper = img.closest('.progressive-image-wrapper');
        const figure = img.closest('.image-figure');
        const skeleton = wrapper?.querySelector('.skeleton-loader');

        console.warn('Failed to load image:', img.src);

        // Try fallback if available. Inside a <picture>, matching <source>
        // elements would still win over a swapped img src, so drop them first.
        const originalSrc = img.dataset.original;
        if (originalSrc && originalSrc !== img.src) {
            img.closest('picture')?.querySelectorAll('source').forEach(s => s.remove());
            img.src = originalSrc;
            return;
        }

        // Mark as error
        this.loadedImages.add(img);
        img.classList.add('error', 'loaded');

        if (wrapper) {
            wrapper.classList.add('error', 'loaded');
            wrapper.setAttribute('data-loading', 'error');
        }

        if (figure) {
            figure.setAttribute('data-loading', 'error');
        }

        // Update skeleton to show error
        if (skeleton) {
            skeleton.classList.add('error');
            skeleton.innerHTML = `
                <div class="error-icon">⚠️</div>
                <div class="error-text">Failed to load image</div>
            `;
        }

        // Trigger custom event
        img.dispatchEvent(new CustomEvent('imageError', {
            bubbles: true,
            detail: { src: img.src }
        }));
    }

    handleInitialVisibleImages() {
        // Handle images that might be immediately visible
        const visibleImages = document.querySelectorAll('.main-image:not(.loaded)');
        visibleImages.forEach(img => {
            const rect = img.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight + 100 && rect.bottom > -100;

            if (isVisible) {
                this.loadImage(img);
            }
        });
    }

    addGlobalEventListeners() {
        // Listen for focus events on images for accessibility
        document.addEventListener('focusin', (e) => {
            if (e.target.classList.contains('main-image') && !e.target.classList.contains('loaded')) {
                this.loadImage(e.target);
            }
        });

        // Listen for user interaction to load images
        ['click', 'touchstart'].forEach(eventType => {
            document.addEventListener(eventType, (e) => {
                const img = e.target.closest('.main-image');
                if (img && !img.classList.contains('loaded')) {
                    this.loadImage(img);
                }
            });
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
                                if (this.imageObserver && !img.hasAttribute('data-observed')) {
                                    this.imageObserver.observe(img);
                                    img.setAttribute('data-observed', 'true');
                                } else if (!this.imageObserver) {
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

    // Public methods
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

    getStats() {
        return {
            loadedImages: this.loadedImages.size,
            totalImages: document.querySelectorAll('.main-image').length
        };
    }
}

// Performance monitoring for skeleton loading
class SkeletonPerformanceMonitor {
    constructor() {
        this.metrics = {
            totalImages: 0,
            loadedImages: 0,
            errorImages: 0,
            skeletonTimes: [],
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
        });

        // Count total images on page
        this.updateTotalCount();

        // Monitor skeleton visibility duration
        this.monitorSkeletonTimes();
    }

    updateTotalCount() {
        this.metrics.totalImages = document.querySelectorAll('.main-image').length;
    }

    recordLoadTime(img) {
        if ('performance' in window && performance.getEntriesByName) {
            const entries = performance.getEntriesByName(img.src);
            if (entries.length > 0) {
                const entry = entries[entries.length - 1];
                const loadTime = entry.responseEnd - entry.startTime;
                this.metrics.loadTimes.push(loadTime);
            }
        }
    }

    monitorSkeletonTimes() {
        const skeletons = document.querySelectorAll('.skeleton-loader');
        skeletons.forEach(skeleton => {
            const startTime = performance.now();
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        const style = mutation.target.style;
                        if (style.opacity === '0' || style.display === 'none') {
                            const endTime = performance.now();
                            this.metrics.skeletonTimes.push(endTime - startTime);
                            observer.disconnect();
                        }
                    }
                });
            });

            observer.observe(skeleton, {
                attributes: true,
                attributeFilter: ['style']
            });
        });
    }

    getStats() {
        const avgLoadTime = this.metrics.loadTimes.length > 0
            ? this.metrics.loadTimes.reduce((a, b) => a + b, 0) / this.metrics.loadTimes.length
            : 0;

        const avgSkeletonTime = this.metrics.skeletonTimes.length > 0
            ? this.metrics.skeletonTimes.reduce((a, b) => a + b, 0) / this.metrics.skeletonTimes.length
            : 0;

        return {
            ...this.metrics,
            successRate: this.metrics.totalImages > 0 ? (this.metrics.loadedImages / this.metrics.totalImages) * 100 : 0,
            averageLoadTime: avgLoadTime,
            averageSkeletonTime: avgSkeletonTime
        };
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReducedMotion) {
        // Initialize skeleton loading
        window.skeletonImageLoader = new SkeletonImageLoader();

        // Initialize performance monitoring (only in development)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            window.skeletonPerformanceMonitor = new SkeletonPerformanceMonitor();

            // Log stats after 5 seconds
            setTimeout(() => {
                console.log('Skeleton Loading Stats:', window.skeletonPerformanceMonitor.getStats());
            }, 5000);
        }
    } else {
        // For users who prefer reduced motion, just load images normally
        document.querySelectorAll('.main-image').forEach(img => {
            img.classList.add('loaded');
            const wrapper = img.closest('.progressive-image-wrapper');
            if (wrapper) wrapper.classList.add('loaded');

            // Hide skeleton immediately
            const skeleton = wrapper?.querySelector('.skeleton-loader');
            if (skeleton) skeleton.style.display = 'none';

            // Hide placeholder immediately
            const placeholder = wrapper?.querySelector('.blur-placeholder');
            if (placeholder) placeholder.style.display = 'none';
        });
    }
});

// Expose API for manual control
window.skeletonLoader = {
    forceLoad: (selector) => window.skeletonImageLoader?.forceLoad(selector),
    refresh: () => window.skeletonImageLoader?.refresh(),
    getStats: () => window.skeletonPerformanceMonitor?.getStats()
};
