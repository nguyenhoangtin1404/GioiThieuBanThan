/**
 * VanillaFullpage - Full page scrolling library không phụ thuộc thư viện bên ngoài
 * @class
 * @description Tạo hiệu ứng full page scrolling tương tự fullpage.js nhưng hoàn toàn tự code.
 * Hỗ trợ navigation dots, keyboard navigation, mouse wheel, touch/swipe, và URL hash anchors.
 * 
 * @example
 * const fullpage = new VanillaFullpage('#fullpage', {
 *   anchors: ['home', 'about', 'contact'],
 *   navigation: true,
 *   scrollingSpeed: 1000,
 *   loopBottom: true
 * });
 */
class VanillaFullpage {
  /**
   * @constructor
   * @param {string|HTMLElement} container - Selector CSS hoặc HTMLElement chứa các sections
   * @param {Object} [options={}] - Cấu hình options
   * @param {number} [options.scrollingSpeed=1000] - Tốc độ scroll animation (milliseconds)
   * @param {boolean} [options.loopBottom=false] - Cho phép loop từ section cuối về section đầu
   * @param {boolean} [options.navigation=true] - Bật/tắt navigation dots bên phải màn hình
   * @param {string[]} [options.anchors=[]] - Mảng anchors cho URL hash (ví dụ: ['home', 'about', 'contact'])
   */
  constructor(container, options = {}) {
    // Xử lý container: có thể là selector string hoặc HTMLElement
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    // Lấy tất cả các sections từ container
    this.sections = Array.from(this.container.querySelectorAll('.section'));
    
    // Trạng thái hiện tại
    this.currentIndex = 0; // Index của section đang active
    this.isScrolling = false; // Flag để tránh scroll quá nhanh
    this.wheelEnabled = true; // Cho phép/khóa xử lý wheel (trackpad/mouse)
    this.navHideTimeout = null; // Timeout để ẩn navigation sau khi không scroll
    this.hideTimeout = null; // Timeout để ẩn section sau khi animation hoàn tất
    
    // Cấu hình từ options với giá trị mặc định
    this.scrollingSpeed = options.scrollingSpeed || 1000;
    this.loopBottom = options.loopBottom || false;
    this.navigation = options.navigation !== false; // Mặc định là true
    this.anchors = options.anchors || [];
    
    // Áp dụng vertical class cho container
    this.container.classList.add('fp-vertical');
    
    // Khởi tạo tất cả components
    this.init();
  }

  /**
   * Bật/tắt xử lý wheel để tránh đổi section (ví dụ khi mở modal)
   * @public
   * @param {boolean} enabled
   */
  setWheelEnabled(enabled) {
    this.wheelEnabled = !!enabled;
  }

  /**
   * Khởi tạo tất cả các components và event listeners
   * @description Thiết lập sections, navigation, keyboard, wheel, và touch events
   * @private
   */
  init() {
    this.setupSections();
    this.setupNavigation();
    this.setupKeyboard();
    this.setupWheel();
    this.setupTouch();
    this.updateNavigation();
    this.updateURL();
    // Đảm bảo navigation ẩn mặc định khi init
    this.ensureNavigationHidden();
  }

  /**
   * Thiết lập trạng thái ban đầu cho các sections
   * @description Section đầu tiên sẽ có class 'active', các section khác có class 'next'
   * @private
   */
  setupSections() {
    const transitionStr = `transform ${this.scrollingSpeed}ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity ${this.scrollingSpeed}ms ease, visibility ${this.scrollingSpeed}ms ease`;

    this.sections.forEach((section, index) => {
      // Xóa tất cả classes cũ
      section.classList.remove('active', 'next', 'prev');
      
      // Đảm bảo transition được set cho tất cả sections
      section.style.transition = transitionStr;
      
      // Set z-index tăng dần để tạo hiệu ứng đè lên nhau (section sau đè lên section trước)
      section.style.zIndex = String(this.sections.length + 1 - index);
      
      if (index === 0) {
        // Section đầu tiên: active
        section.classList.add('active');
        section.style.transform = 'translateY(0)';
        section.style.opacity = '1';
        section.style.visibility = 'visible';
        section.style.pointerEvents = 'auto';
        section.style.zIndex = String(this.sections.length + 2);
        // Đảm bảo content bên trong hiển thị
        Array.from(section.children).forEach(child => {
          child.style.opacity = '1';
          child.style.visibility = 'visible';
        });
      } else {
        // Các section khác: next
        section.classList.add('next');
        section.style.transform = 'translateY(100%)';
        section.style.opacity = '0';
        section.style.visibility = 'hidden';
        section.style.pointerEvents = 'none';
      }
    });
  }

  /**
   * Thiết lập navigation dots (các chấm bên phải màn hình)
   * @description Thêm event listeners cho các navigation links
   * @private
   */
  setupNavigation() {
    // Nếu navigation bị tắt, không làm gì
    if (!this.navigation) return;

    const nav = document.querySelector('.fp-nav');
    const navLinks = document.querySelectorAll('.fp-nav a');
    
    // Thêm hover event cho navigation
    if (nav) {
      nav.addEventListener('mouseenter', () => {
        // Khi hover vào navigation, hiện rõ và không ẩn
        this.showNavigation();
        // Clear timeout ẩn nếu có
        if (this.navHideTimeout) {
          clearTimeout(this.navHideTimeout);
          this.navHideTimeout = null;
        }
      });
      
      nav.addEventListener('mouseleave', () => {
        // Khi rời chuột, bắt đầu lại timeout ẩn sau 1s
        this.hideNavigation();
      });
    }
    
    navLinks.forEach((link, index) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        // Hiển thị navigation khi người dùng click vào dot
        this.showNavigation();
        this.hideNavigation();
        this.goToSection(index);
      });
    });
  }

  /**
   * Thiết lập keyboard navigation
   * @description Hỗ trợ các phím: Arrow Up/Down, Page Up/Down, Home, End
   * @private
   */
  setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Nếu đang scroll, bỏ qua
      if (this.isScrolling) return;

      switch(e.key) {
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault();
          this.showNavigation();
          this.moveDown();
          this.hideNavigation();
          break;
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          this.showNavigation();
          this.moveUp();
          this.hideNavigation();
          break;
        case 'Home':
          e.preventDefault();
          this.showNavigation();
          this.goToSection(0);
          this.hideNavigation();
          break;
        case 'End':
          e.preventDefault();
          this.showNavigation();
          this.goToSection(this.sections.length - 1);
          this.hideNavigation();
          break;
      }
    });
  }

  /**
   * Thiết lập mouse wheel scrolling
   * @description Xử lý scroll bằng chuột với debounce để tránh scroll quá nhanh
   * @private
   */
  setupWheel() {
    let wheelTimeout;
    document.addEventListener('wheel', (e) => {
      // Nếu wheel đang bị khóa, bỏ qua (không đổi section)
      if (!this.wheelEnabled) return;
      // Nếu đang scroll, bỏ qua
      if (this.isScrolling) return;

      // Hiển thị navigation khi scroll
      this.showNavigation();

      // Debounce: đợi 50ms trước khi xử lý scroll tiếp theo
      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => {
        const delta = e.deltaY;
        if (delta > 0) {
          // Scroll xuống
          this.moveDown();
        } else if (delta < 0) {
          // Scroll lên
          this.moveUp();
        }
        // Sau khi scroll xong, reset timer ẩn (1s sau khi không scroll)
        this.hideNavigation();
      }, 50);
    }, { passive: true }); // passive: true để tăng performance
  }

  /**
   * Thiết lập touch/swipe cho mobile
   * @description Hỗ trợ swipe lên/xuống trên thiết bị cảm ứng
   * @private
   */
  setupTouch() {
    let touchStartY = 0;
    let touchEndY = 0;

    // Lưu vị trí bắt đầu touch
    document.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    // Xử lý khi kết thúc touch
    document.addEventListener('touchend', (e) => {
      if (this.isScrolling) return;
      
      touchEndY = e.changedTouches[0].clientY;

      // Vertical: xử lý theo trục Y
      const diff = touchStartY - touchEndY;
      if (Math.abs(diff) > 50) {
        // Hiển thị navigation khi swipe
        this.showNavigation();
        
        if (diff > 0) {
          // Swipe lên -> di chuyển xuống
          this.moveDown();
        } else {
          // Swipe xuống -> di chuyển lên
          this.moveUp();
        }
        
        // Sau khi swipe xong, reset timer ẩn (1s sau khi không swipe)
        this.hideNavigation();
      }
    }, { passive: true });
  }

  /**
   * Di chuyển xuống section tiếp theo
   * @description Nếu đang ở section cuối và loopBottom = true, quay về section đầu
   * @public
   */
  moveDown() {
    if (this.currentIndex < this.sections.length - 1) {
      // Còn section phía dưới
      this.goToSection(this.currentIndex + 1);
    } else if (this.loopBottom) {
      // Ở section cuối và cho phép loop -> quay về đầu
      this.goToSection(0);
    }
  }

  /**
   * Di chuyển lên section trước đó
   * @description Chỉ di chuyển nếu không phải section đầu tiên
   * @public
   */
  moveUp() {
    if (this.currentIndex > 0) {
      this.goToSection(this.currentIndex - 1);
    }
  }

  /**
   * Di chuyển đến section cụ thể theo index
   * @description Method chính để chuyển đổi giữa các sections
   * @param {number} index - Index của section muốn chuyển đến (0-based)
   * @public
   * @example
   * fullpage.goToSection(2); // Di chuyển đến section thứ 3
   */
  goToSection(index) {
    // Kiểm tra điều kiện: đang scroll, index không hợp lệ, hoặc đã ở section đó
    if (this.isScrolling || index === this.currentIndex) return;
    if (index < 0 || index >= this.sections.length) return;

    // Bắt đầu scroll animation
    this.isScrolling = true;
    this.currentIndex = index;
    const totalSections = this.sections.length;
    const transitionStr = `transform ${this.scrollingSpeed}ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity ${this.scrollingSpeed}ms ease, visibility ${this.scrollingSpeed}ms ease`;

    // Cập nhật classes và transform cho tất cả sections
    this.sections.forEach((section, i) => {
      // Xóa tất cả classes cũ
      section.classList.remove('active', 'prev', 'next');
      
      if (i === index) {
        // Section hiện tại: active (ở giữa màn hình)
        section.classList.add('active');
        section.style.transform = 'translateY(0)';
        section.style.transition = transitionStr;
        // Active luôn nằm trên cùng để đè lên section trước đó
        section.style.zIndex = String(totalSections + 2);
        section.style.opacity = '1';
        section.style.visibility = 'visible';
        section.style.pointerEvents = 'auto';
        // Đảm bảo content bên trong hiển thị
        Array.from(section.children).forEach(child => {
          if (child.tagName !== 'SCRIPT') {
            child.style.opacity = '1';
            child.style.visibility = 'visible';
            // KHÔNG set display - để CSS của component tự quyết định
            
            // Đảm bảo tất cả children của component cũng hiển thị
            Array.from(child.children || []).forEach(grandchild => {
              grandchild.style.opacity = '1';
              grandchild.style.visibility = 'visible';
            });
          }
        });
      } else if (i < index) {
        // Sections trước đó: prev
        section.classList.add('prev');
        section.style.transform = 'translateY(-100%)';
        section.style.transition = transitionStr;
        section.style.zIndex = String(totalSections + 1 - (index - i));
        // Giữ opacity/visibility trong lúc animation để tránh nháy trắng, sẽ ẩn sau khi hoàn tất
        section.style.opacity = '1';
        section.style.visibility = 'visible';
        section.style.pointerEvents = 'none';
      } else {
        // Sections sau: next
        section.classList.add('next');
        section.style.transform = 'translateY(100%)';
        section.style.transition = transitionStr;
        section.style.zIndex = String(totalSections + 1 - (i - index));
        section.style.opacity = '1';
        section.style.visibility = 'visible';
        section.style.pointerEvents = 'none';
      }
    });

    // Ẩn các section không active sau khi animation hoàn tất để tránh lộ nền trắng khi bắt đầu cuộn
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
    this.hideTimeout = setTimeout(() => {
      this.sections.forEach((section, idx) => {
        if (idx !== this.currentIndex) {
          section.style.opacity = '0';
          section.style.visibility = 'hidden';
          section.style.pointerEvents = 'none';
        } else {
          section.style.opacity = '1';
          section.style.visibility = 'visible';
          section.style.pointerEvents = 'auto';
          section.style.zIndex = String(totalSections + 2);
        }
      });
      this.hideTimeout = null;
    }, this.scrollingSpeed);

    // Cập nhật navigation dots và URL
    this.updateNavigation();
    this.updateURL();

    // Sau khi animation hoàn tất, cho phép scroll tiếp
    setTimeout(() => {
      this.isScrolling = false;
    }, this.scrollingSpeed);
  }

  /**
   * Cập nhật trạng thái navigation dots
   * @description Thêm class 'active' cho navigation dot tương ứng với section hiện tại
   * @private
   */
  updateNavigation() {
    // Nếu navigation bị tắt, không làm gì
    if (!this.navigation) return;
    
    const navLinks = document.querySelectorAll('.fp-nav a');
    navLinks.forEach((link, index) => {
      if (index === this.currentIndex) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  /**
   * Hiển thị navigation dots
   * @description Thêm class 'fp-nav-visible' để hiện navigation và clear timeout ẩn
   * @private
   */
  showNavigation() {
    // Nếu navigation bị tắt, không làm gì
    if (!this.navigation) return;
    
    const nav = document.querySelector('.fp-nav');
    
    if (nav) {
      // Clear timeout ẩn navigation nếu có
      if (this.navHideTimeout) {
        clearTimeout(this.navHideTimeout);
        this.navHideTimeout = null;
      }
      
      // Đảm bảo transition được set
      nav.style.transition = 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out';
      
      // Dùng requestAnimationFrame để đảm bảo browser render đúng
      requestAnimationFrame(() => {
        // Force reflow để đảm bảo initial state được apply
        void nav.offsetHeight;
        
        // Set inline style để hiện navigation với transition (thay vì dùng class)
        nav.style.opacity = '1';
        nav.style.transform = 'translateY(-50%) scale(1)';
        nav.style.pointerEvents = 'auto';
        
        // Thêm class để đánh dấu (cho CSS khác nếu cần)
        nav.classList.add('fp-nav-visible');
      });
    }
  }

  /**
   * Đảm bảo navigation ẩn mặc định
   * @description Xóa class 'fp-nav-visible' ngay lập tức để ẩn navigation
   * @private
   */
  ensureNavigationHidden() {
    // Nếu navigation bị tắt, không làm gì
    if (!this.navigation) return;
    
    // Clear timeout cũ nếu có
    if (this.navHideTimeout) {
      clearTimeout(this.navHideTimeout);
      this.navHideTimeout = null;
    }
    
    // Ẩn navigation - force set initial state
    const nav = document.querySelector('.fp-nav');
    if (nav) {
      // Xóa class trước
      nav.classList.remove('fp-nav-visible');
      
      // Force set initial state để đảm bảo mờ và thu nhỏ (không ẩn hoàn toàn)
      nav.style.transition = 'none'; // Tắt transition khi set initial state
      nav.style.opacity = '0.3';
      nav.style.pointerEvents = 'auto'; // Vẫn cho phép click khi mờ
      nav.style.transform = 'translateY(-50%) scale(0.8)';
      
      // Sau đó enable transition lại
      requestAnimationFrame(() => {
        nav.style.transition = 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out';
      });
    }
  }

  /**
   * Ẩn navigation dots sau delay
   * @description Xóa class 'fp-nav-visible' sau 1s để ẩn navigation với transition mượt
   * @private
   */
  hideNavigation() {
    // Nếu navigation bị tắt, không làm gì
    if (!this.navigation) return;
    
    // Clear timeout cũ nếu có
    if (this.navHideTimeout) {
      clearTimeout(this.navHideTimeout);
    }
    
    // Set timeout mới để ẩn navigation sau 1s
    this.navHideTimeout = setTimeout(() => {
      const nav = document.querySelector('.fp-nav');
      
      if (nav) {
        // Đảm bảo transition được set
        nav.style.transition = 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out';
        
        // Dùng requestAnimationFrame để đảm bảo browser render đúng
        requestAnimationFrame(() => {
          // Force reflow
          void nav.offsetHeight;
          
          // Set inline style để làm mờ và thu nhỏ navigation với transition (không ẩn hoàn toàn)
          nav.style.opacity = '0.3';
          nav.style.transform = 'translateY(-50%) scale(0.8)';
          nav.style.pointerEvents = 'auto'; // Vẫn cho phép click khi mờ
          
          // Xóa class để đánh dấu
          nav.classList.remove('fp-nav-visible');
        });
      }
      this.navHideTimeout = null;
    }, 1000);
  }

  /**
   * Cập nhật URL hash theo anchor của section hiện tại
   * @description Sử dụng history.pushState để cập nhật URL mà không reload trang
   * @private
   */
  updateURL() {
    // Nếu có anchor cho section hiện tại
    if (this.anchors[this.currentIndex]) {
      const anchor = this.anchors[this.currentIndex];
      
      // Sử dụng pushState nếu browser hỗ trợ (modern browsers)
      if (history.pushState) {
        history.pushState(null, null, '#' + anchor);
      } else {
        // Fallback cho browsers cũ
        window.location.hash = anchor;
      }
    }
  }
}

// Expose class ra window để có thể sử dụng mà không cần import
if (typeof window !== 'undefined') {
  window.VanillaFullpage = VanillaFullpage;
}

// Export cho ES modules (nếu được import)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VanillaFullpage;
}

