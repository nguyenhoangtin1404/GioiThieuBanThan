/**
 * VanillaFullpage - Full page scrolling library không phụ thuộc thư viện bên ngoài
 * @class
 * @description Tạo hiệu ứng full page scrolling tương tự fullpage.js nhưng hoàn toàn tự code.
 * Hỗ trợ keyboard navigation, mouse wheel, touch/swipe, và URL hash anchors.
 * Gọi destroy() để gỡ mọi listener (ví dụ khi chuyển sang layout mobile).
 * 
 * @example
 * const fullpage = new VanillaFullpage('#fullpage', {
 *   anchors: ['home', 'about', 'contact'],
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
    this.lastInnerScroll = 0; // Lần cuối nội dung bên trong section được cuộn (ms)
    this.inputEnabled = true; // Cho phép/khóa phím, wheel và vuốt (ví dụ khi mở modal)
    this.hideTimeout = null; // Timeout để ẩn section sau khi animation hoàn tất
    this.scrollTimeout = null; // Timeout mở khóa isScrolling sau khi animation hoàn tất
    // Mọi listener gắn với signal này để destroy() gỡ hết một lần
    this.abort = new AbortController();
    
    // Cấu hình từ options với giá trị mặc định
    this.scrollingSpeed = options.scrollingSpeed || 1000;
    this.loopBottom = options.loopBottom || false;
    this.anchors = options.anchors || [];
    
    // Áp dụng vertical class cho container
    this.container.classList.add('fp-vertical');
    
    // Khởi tạo tất cả components
    this.init();
  }

  /**
   * Bật/tắt mọi thao tác đổi section (phím, wheel, vuốt), ví dụ khi mở modal.
   * Khi tắt, các handler bỏ qua sự kiện hoàn toàn (không preventDefault) để modal tự cuộn.
   * @public
   * @param {boolean} enabled
   */
  setAllowScrolling(enabled) {
    this.inputEnabled = !!enabled;
  }

  /**
   * Tên cũ của setAllowScrolling
   * @public
   * @param {boolean} enabled
   */
  setWheelEnabled(enabled) {
    this.setAllowScrolling(enabled);
  }

  /**
   * Khởi tạo tất cả các components và event listeners
   * @description Thiết lập sections, keyboard, wheel, và touch events
   * @private
   */
  init() {
    const { signal } = this.abort;
    this.setupSections();
    this.setupKeyboard();
    this.sections.forEach((section) => {
      section.addEventListener('scroll', () => { this.lastInnerScroll = Date.now(); }, { passive: true, signal });
    });
    this.markOverflow();
    window.addEventListener('load', () => this.markOverflow(), { signal });
    window.addEventListener('resize', () => this.markOverflow(), { signal });
    this.setupWheel();
    this.setupTouch();
    this.updateURL();
  }

  /**
   * Gỡ mọi listener và timer của instance này
   * @description Không reset style của sections: layout mobile tự ghi đè
   * @public
   */
  destroy() {
    this.abort.abort();
    clearTimeout(this.hideTimeout);
    clearTimeout(this.scrollTimeout);
    this.hideTimeout = null;
    this.scrollTimeout = null;
    this.isScrolling = false;
    this.container.classList.remove('fp-vertical');
    this.sections.forEach((section) => section.classList.remove('fp-overflow'));
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
   * Thiết lập keyboard navigation
   * @description Hỗ trợ các phím: Arrow Up/Down, Page Up/Down, Home, End
   * @private
   */
  setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Đang khóa (modal mở) hoặc đang scroll: bỏ qua
      if (!this.inputEnabled || this.isScrolling) return;

      // Section dài: phím lên/xuống cuộn nội dung bên trong trước
      const step = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1 }[e.key];
      if (step && this.canScrollInside(step)) {
        e.preventDefault();
        const section = this.sections[this.currentIndex];
        const distance = e.key.startsWith('Page') ? section.clientHeight * 0.9 : 80;
        section.scrollBy({ top: step * distance, behavior: 'smooth' });
        return;
      }
      if (step && this.isHoldingAtEdge()) {
        e.preventDefault();
        return;
      }

      switch(e.key) {
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault();
          this.moveDown();
          break;
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          this.moveUp();
          break;
        case 'Home':
          e.preventDefault();
          this.goToSection(0);
          break;
        case 'End':
          e.preventDefault();
          this.goToSection(this.sections.length - 1);
          break;
      }
    }, { signal: this.abort.signal });
  }

  /**
   * Thiết lập mouse wheel scrolling
   * @description Xử lý scroll bằng chuột với debounce để tránh scroll quá nhanh
   * @private
   */
  setupWheel() {
    let wheelTimeout;
    let lastWheel = 0;
    document.addEventListener('wheel', (e) => {
      // Khoảng cách tới lần wheel trước: nhỏ nghĩa là cùng một cú lăn (hoặc quán tính trackpad)
      const now = Date.now();
      const gap = now - lastWheel;
      lastWheel = now;
      // Nếu đang bị khóa (modal mở), bỏ qua (không đổi section)
      if (!this.inputEnabled) return;
      // Nếu đang scroll, bỏ qua
      if (this.isScrolling) return;
      // Section dài hơn màn hình: cuộn hết nội dung bên trong trước rồi mới đổi section.
      if (this.canScrollInside(e.deltaY)) {
        this.lastInnerScroll = now;
        return;
      }
      // Vừa chạm cuối nội dung: đứng lại, cần ngừng tay rồi lăn một cú mới mới sang section kế
      if (this.isOverflowing() && (gap < VanillaFullpage.GESTURE_GAP || this.isHoldingAtEdge())) return;

      // Debounce: đợi 50ms trước khi xử lý scroll tiếp theo
      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => {
        // Listener passive nên trình duyệt có thể đã cuộn nội dung trước khi handler chạy;
        // tới đây sự kiện scroll đã cập nhật lastInnerScroll nên kiểm tra lại.
        if (this.isHoldingAtEdge()) return;
        const delta = e.deltaY;
        if (delta > 0) {
          // Scroll xuống
          this.moveDown();
        } else if (delta < 0) {
          // Scroll lên
          this.moveUp();
        }
      }, 50);
    }, { passive: true, signal: this.abort.signal }); // passive: true để tăng performance
  }

  /**
   * Thiết lập touch/swipe cho mobile
   * @description Hỗ trợ swipe lên/xuống trên thiết bị cảm ứng
   * @private
   */
  setupTouch() {
    let touchStartY = 0;
    let touchEndY = 0;
    // Section dài có thể cuộn tiếp theo hướng nào, đo lúc bắt đầu chạm (trước khi trình duyệt cuộn nội dung)
    let couldScrollDown = false;
    let couldScrollUp = false;

    // Lưu vị trí bắt đầu touch
    document.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
      couldScrollDown = this.canScrollInside(1);
      couldScrollUp = this.canScrollInside(-1);
    }, { passive: true, signal: this.abort.signal });

    // Xử lý khi kết thúc touch
    document.addEventListener('touchend', (e) => {
      if (!this.inputEnabled || this.isScrolling) return;
      
      touchEndY = e.changedTouches[0].clientY;

      // Vertical: xử lý theo trục Y
      const diff = touchStartY - touchEndY;
      // Vuốt bên trong section dài: để trình duyệt cuộn nội dung, chưa đổi section
      if ((diff > 0 && couldScrollDown) || (diff < 0 && couldScrollUp)) return;
      // Vừa cuộn tới cuối nội dung: cần dừng một chút rồi vuốt lần nữa mới đổi section
      if (this.isHoldingAtEdge()) return;
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          // Swipe lên -> di chuyển xuống
          this.moveDown();
        } else {
          // Swipe xuống -> di chuyển lên
          this.moveUp();
        }
      }
    }, { passive: true, signal: this.abort.signal });
  }

  /**
   * Section đang hiện có dài hơn màn hình không
   * @private
   */
  isOverflowing(section = this.sections[this.currentIndex]) {
    return !!section && section.scrollHeight > section.clientHeight + 1;
  }

  /**
   * Vừa cuộn nội dung section dài trong EDGE_PAUSE ms: giữ nguyên section để người dùng kịp đọc/bấm
   * @private
   */
  isHoldingAtEdge() {
    return this.isOverflowing() && Date.now() - this.lastInnerScroll < VanillaFullpage.EDGE_PAUSE;
  }

  /**
   * Đánh dấu `fp-overflow` cho section dài hơn màn hình (CSS thêm khoảng trống phía dưới)
   * @private
   */
  markOverflow() {
    this.sections.forEach((section) => {
      section.classList.remove('fp-overflow');
      section.classList.toggle('fp-overflow', this.isOverflowing(section));
    });
  }

  /**
   * Section đang hiện còn nội dung để cuộn theo hướng `delta` (>0 xuống, <0 lên) không
   * @private
   */
  canScrollInside(delta) {
    const section = this.sections[this.currentIndex];
    if (!this.isOverflowing(section)) return false;
    if (delta > 0) return section.scrollTop + section.clientHeight < section.scrollHeight - 1;
    if (delta < 0) return section.scrollTop > 1;
    return false;
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
    // Vào section từ dưới lên thì đứng ở cuối nội dung, từ trên xuống thì ở đầu
    this.markOverflow();
    const target = this.sections[index];
    if (target) target.scrollTop = index < this.currentIndex ? target.scrollHeight : 0;
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

    // Cập nhật URL
    this.updateURL();

    // Sau khi animation hoàn tất, cho phép scroll tiếp
    clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => {
      this.isScrolling = false;
      this.scrollTimeout = null;
    }, this.scrollingSpeed);
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

// Section dài: thời gian (ms) giữ nguyên ở cuối nội dung sau lần cuộn cuối, để người dùng kịp đọc/bấm
VanillaFullpage.EDGE_PAUSE = 800;
// Hai lần wheel cách nhau ít hơn mức này (ms) được coi là cùng một cú lăn / quán tính trackpad
VanillaFullpage.GESTURE_GAP = 250;

// Expose class ra window để có thể sử dụng mà không cần import
if (typeof window !== 'undefined') {
  window.VanillaFullpage = VanillaFullpage;
}

// Export cho ES modules (nếu được import)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VanillaFullpage;
}

