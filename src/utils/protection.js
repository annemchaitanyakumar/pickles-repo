// Anti-debugging and protection utilities
export const enableProtection = () => {
  if (process.env.NODE_ENV === 'production') {
    // Only prevent right-click on images
    document.addEventListener('contextmenu', (e) => {
      if (e.target.tagName === 'IMG') {
        e.preventDefault();
      }
    });

    // Disable keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.keyCode === 123 || 
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) ||
        (e.ctrlKey && e.keyCode === 85)
      ) {
        e.preventDefault();
      }
    });

    // Anti-debugging
    const antiDebug = () => {
      if (
        window.outerHeight - window.innerHeight > 200 ||
        window.outerWidth - window.innerWidth > 200
      ) {
        document.body.innerHTML = 'Developer tools detected';
      }
    };
    setInterval(antiDebug, 1000);

    // Prevent source code viewing
    document.addEventListener('keydown', function(e) {
      if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
      }
    });
  }
};