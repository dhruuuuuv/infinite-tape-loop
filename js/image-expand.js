// Enhanced image expand functionality with zoom
document.addEventListener('DOMContentLoaded', function() {
    // Target only content images, not header images
    const contentImages = document.querySelectorAll('.content-container img:not(.project-header-image img), .image-figure img');

    contentImages.forEach(function(img) {
        // Add cursor pointer to indicate clickability
        img.style.cursor = 'zoom-in';

        img.addEventListener('click', function() {
            // Create overlay
            const overlay = document.createElement('div');
            overlay.className = 'image-overlay';

            // Create image container for zoom functionality
            const imageContainer = document.createElement('div');
            imageContainer.className = 'image-container';

            // Create expanded image
            const expandedImg = document.createElement('img');
            expandedImg.src = img.src;
            expandedImg.alt = img.alt;
            expandedImg.className = 'expanded-image';

            // Create close button
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '&times;';
            closeBtn.className = 'close-button';
            closeBtn.setAttribute('aria-label', 'Close expanded image');

            // Create zoom controls
            const zoomControls = document.createElement('div');
            zoomControls.className = 'zoom-controls';

            const zoomInBtn = document.createElement('button');
            zoomInBtn.innerHTML = '+';
            zoomInBtn.className = 'zoom-btn zoom-in';
            zoomInBtn.setAttribute('aria-label', 'Zoom in');

            const zoomOutBtn = document.createElement('button');
            zoomOutBtn.innerHTML = '−';
            zoomOutBtn.className = 'zoom-btn zoom-out';
            zoomOutBtn.setAttribute('aria-label', 'Zoom out');

            const resetBtn = document.createElement('button');
            resetBtn.innerHTML = '⌂';
            resetBtn.className = 'zoom-btn reset';
            resetBtn.setAttribute('aria-label', 'Reset zoom');

            zoomControls.appendChild(zoomInBtn);
            zoomControls.appendChild(zoomOutBtn);
            zoomControls.appendChild(resetBtn);

            // Append elements
            imageContainer.appendChild(expandedImg);
            overlay.appendChild(imageContainer);
            overlay.appendChild(closeBtn);
            overlay.appendChild(zoomControls);
            document.body.appendChild(overlay);

            // Animate in
            requestAnimationFrame(() => {
                overlay.classList.add('visible');
            });

            // Prevent body scroll
            document.body.style.overflow = 'hidden';

            // Zoom functionality
            let scale = 1;
            let translateX = 0;
            let translateY = 0;
            let isDragging = false;
            let startX, startY, initialX, initialY;

            function updateTransform() {
                // Apply scale transform instead of changing dimensions
                expandedImg.style.transform = `scale(${scale}) translate(${translateX / scale}px, ${translateY / scale}px)`;
                expandedImg.style.cursor = scale > 1 ? 'grab' : 'zoom-in';

                if (scale > 1) {
                    expandedImg.classList.add('zoomed');
                } else {
                    expandedImg.classList.remove('zoomed');
                }
            }

            // Zoom controls
            zoomInBtn.addEventListener('click', () => {
                scale = Math.min(scale * 1.5, 3);
                updateTransform();
            });

            zoomOutBtn.addEventListener('click', () => {
                scale = Math.max(scale / 1.5, 1);
                if (scale === 1) {
                    translateX = 0;
                    translateY = 0;
                }
                updateTransform();
            });

            resetBtn.addEventListener('click', () => {
                scale = 1;
                translateX = 0;
                translateY = 0;
                updateTransform();
            });

            // Double click to zoom
            expandedImg.addEventListener('dblclick', (e) => {
                e.preventDefault();
                if (scale === 1) {
                    scale = 2;
                } else {
                    scale = 1;
                    translateX = 0;
                    translateY = 0;
                }
                updateTransform();
            });

            // Wheel zoom
            imageContainer.addEventListener('wheel', (e) => {
                e.preventDefault();

                const delta = e.deltaY > 0 ? 0.9 : 1.1;
                const newScale = Math.min(Math.max(scale * delta, 1), 3);

                if (newScale !== scale) {
                    scale = newScale;
                    if (scale === 1) {
                        translateX = 0;
                        translateY = 0;
                    }
                    updateTransform();
                }
            });

            // Drag functionality when zoomed
            expandedImg.addEventListener('mousedown', (e) => {
                if (scale > 1) {
                    isDragging = true;
                    startX = e.clientX - translateX;
                    startY = e.clientY - translateY;
                    expandedImg.style.cursor = 'grabbing';
                    e.preventDefault();
                }
            });

            document.addEventListener('mousemove', (e) => {
                if (isDragging && scale > 1) {
                    translateX = e.clientX - startX;
                    translateY = e.clientY - startY;
                    updateTransform();
                }
            });

            document.addEventListener('mouseup', () => {
                isDragging = false;
                if (scale > 1) {
                    expandedImg.style.cursor = 'grab';
                }
            });

            // Touch support for mobile
            let initialDistance = 0;
            let initialScale = 1;

            expandedImg.addEventListener('touchstart', (e) => {
                if (e.touches.length === 2) {
                    e.preventDefault();
                    initialDistance = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                    initialScale = scale;
                } else if (e.touches.length === 1 && scale > 1) {
                    isDragging = true;
                    const touch = e.touches[0];
                    startX = touch.clientX - translateX;
                    startY = touch.clientY - translateY;
                }
            });

            expandedImg.addEventListener('touchmove', (e) => {
                if (e.touches.length === 2) {
                    e.preventDefault();
                    const distance = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                    scale = Math.min(Math.max(initialScale * (distance / initialDistance), 1), 3);
                    if (scale === 1) {
                        translateX = 0;
                        translateY = 0;
                    }
                    updateTransform();
                } else if (e.touches.length === 1 && isDragging && scale > 1) {
                    e.preventDefault();
                    const touch = e.touches[0];
                    translateX = touch.clientX - startX;
                    translateY = touch.clientY - startY;
                    updateTransform();
                }
            });

            expandedImg.addEventListener('touchend', () => {
                isDragging = false;
            });

            // Close functionality
            function closeOverlay() {
                overlay.classList.add('closing');
                setTimeout(() => {
                    if (document.body.contains(overlay)) {
                        document.body.removeChild(overlay);
                    }
                    document.body.style.overflow = '';
                }, 200);
            }

            // Close on button click
            closeBtn.addEventListener('click', closeOverlay);

            // Close on overlay click (but not on image or controls)
            overlay.addEventListener('click', function(e) {
                // Close if clicked on overlay, image container, or anywhere that's not the image or controls
                const isImageClick = expandedImg.contains(e.target) || e.target === expandedImg;
                const isControlsClick = zoomControls.contains(e.target) || closeBtn.contains(e.target) || e.target === closeBtn;

                if (!isImageClick && !isControlsClick) {
                    closeOverlay();
                }
            });

            // Close on escape key
            function handleKeyPress(e) {
                if (e.key === 'Escape') {
                    closeOverlay();
                    document.removeEventListener('keydown', handleKeyPress);
                }
            }
            document.addEventListener('keydown', handleKeyPress);
        });
    });
});
