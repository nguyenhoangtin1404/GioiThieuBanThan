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
   * @param {string} [options.direction='vertical'] - Hướng scroll: 'vertical' (dọc) hoặc 'horizontal' (ngang)
   * @param {boolean} [options.allowVerticalScrollInHorizontal=false] - Khi direction='horizontal', cho phép scroll bằng cả cuộn dọc (deltaY) và cuộn ngang (deltaX). Mặc định false (chỉ hỗ trợ cuộn ngang)
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
    
    // Cấu hình từ options với giá trị mặc định
    this.scrollingSpeed = options.scrollingSpeed || 1000;
    this.loopBottom = options.loopBottom || false;
    this.navigation = options.navigation !== false; // Mặc định là true
    this.anchors = options.anchors || [];
    this.direction = options.direction || 'vertical'; // 'vertical' hoặc 'horizontal'
    this.allowVerticalScrollInHorizontal = options.allowVerticalScrollInHorizontal === true; // Mặc định là false
    
    // Áp dụng direction class cho container
    this.container.classList.remove('fp-horizontal', 'fp-vertical');
    if (this.direction === 'horizontal') {
      this.container.classList.add('fp-horizontal');
    } else {
      this.container.classList.add('fp-vertical');
    }
    
    // Khởi tạo tất cả components
    this.init();
  }

  /**
   * Khởi tạo tất cả các components và event listeners
   * @description Thiết lập sections, navigation, keyboard, wheel, và touch events
   * @private
   */
  init() {
    // Horizontal mode: setup sections với position absolute (giống test file)
    if (this.direction === 'horizontal') {
      // Container: position relative, width 100vw (không dùng flex)
      this.container.style.position = 'relative';
      this.container.style.width = '100vw';
      this.container.style.height = '100vh';
      this.container.style.overflowX = 'hidden';
      this.container.style.overflowY = 'hidden';
      this.container.style.transform = '';
      
      // Sections: position absolute, top 0, left 0 (giống test file)
      // Background gradients cho từng section
      const gradients = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
      ];
      
      this.sections.forEach((section, index) => {
        section.style.position = 'absolute';
        section.style.top = '0';
        section.style.left = '0';
        section.style.width = '100vw';
        section.style.height = '100vh';
        // Set background gradient trực tiếp
        if (gradients[index]) {
          section.style.background = gradients[index];
          section.style.backgroundImage = gradients[index];
        }
        // #region agent log
        const sectionStyle = window.getComputedStyle(section);
        fetch('http://127.0.0.1:7244/ingest/bb3a76a3-4213-4f7d-899e-96fc425975b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'vanilla-fullpage.js:95',message:'Section setup for horizontal',data:{index:index,sectionPosition:sectionStyle.position,sectionTop:sectionStyle.top,sectionLeft:sectionStyle.left,sectionWidth:sectionStyle.width,sectionHeight:sectionStyle.height,sectionBackground:sectionStyle.background},timestamp:Date.now(),sessionId:'debug-session',runId:'run6',hypothesisId:'U'})}).catch(()=>{});
        // #endregion
      });
    }
    this.setupSections();
    this.setupNavigation();
    this.setupKeyboard();
    this.setupWheel();
    this.setupTouch();
    this.updateNavigation();
    this.updateURL();
  }

  /**
   * Thiết lập trạng thái ban đầu cho các sections
   * @description Section đầu tiên sẽ có class 'active', các section khác có class 'next'
   * @private
   */
  setupSections() {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/bb3a76a3-4213-4f7d-899e-96fc425975b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'vanilla-fullpage.js:80',message:'setupSections called',data:{sectionsCount:this.sections.length,direction:this.direction},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'P'})}).catch(()=>{});
    // #endregion

    this.sections.forEach((section, index) => {
      // Xóa tất cả classes cũ
      section.classList.remove('active', 'next', 'prev');
      
      // Đảm bảo transition được set cho tất cả sections
      section.style.transition = 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.6s ease, visibility 0.6s ease';
      
      // Set z-index tăng dần để tạo hiệu ứng đè lên nhau (section sau đè lên section trước)
      section.style.zIndex = String(index + 1);
      
      if (index === 0) {
        // Section đầu tiên: active
        section.classList.add('active');
        // Apply transform trực tiếp
        if (this.direction === 'horizontal') {
          section.style.transform = 'translateX(0)';
        } else {
          section.style.transform = 'translateY(0)';
        }
        section.style.opacity = '1';
        section.style.visibility = 'visible';
        // Đảm bảo content bên trong hiển thị
        Array.from(section.children).forEach(child => {
          child.style.opacity = '1';
          child.style.visibility = 'visible';
        });
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/bb3a76a3-4213-4f7d-899e-96fc425975b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'vanilla-fullpage.js:100',message:'Section 0 setup',data:{transform:section.style.transform,opacity:section.style.opacity,visibility:section.style.visibility,classes:section.className},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'Q'})}).catch(()=>{});
        // #endregion
      } else {
        // Các section khác: next
        section.classList.add('next');
        // Apply transform trực tiếp
        if (this.direction === 'horizontal') {
          section.style.transform = 'translateX(100vw)';
        } else {
          section.style.transform = 'translateY(100%)';
        }
        section.style.opacity = '0';
        section.style.visibility = 'hidden';
        // Giữ z-index để section vẫn đè lên nhau khi transition
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/bb3a76a3-4213-4f7d-899e-96fc425975b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'vanilla-fullpage.js:115',message:'Section next setup',data:{index:index,transform:section.style.transform,opacity:section.style.opacity,visibility:section.style.visibility,classes:section.className},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'R'})}).catch(()=>{});
        // #endregion
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

    const navLinks = document.querySelectorAll('.fp-nav a');
    navLinks.forEach((link, index) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
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

      if (this.direction === 'horizontal') {
        // Horizontal: xử lý keyboard navigation
        switch(e.key) {
          case 'ArrowRight':
            e.preventDefault();
            this.moveDown();
            break;
          case 'ArrowLeft':
            e.preventDefault();
            this.moveUp();
            break;
          case 'ArrowDown':
            // Chỉ hỗ trợ Arrow Down nếu allowVerticalScrollInHorizontal = true
            if (this.allowVerticalScrollInHorizontal) {
              e.preventDefault();
              this.moveDown();
            }
            break;
          case 'ArrowUp':
            // Chỉ hỗ trợ Arrow Up nếu allowVerticalScrollInHorizontal = true
            if (this.allowVerticalScrollInHorizontal) {
              e.preventDefault();
              this.moveUp();
            }
            break;
          case 'PageDown':
            e.preventDefault();
            this.moveDown();
            break;
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
      } else {
        // Vertical: ArrowUp/Down (mặc định)
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
            this.goToSection(0); // Di chuyển đến section đầu tiên
            break;
          case 'End':
            e.preventDefault();
            this.goToSection(this.sections.length - 1); // Di chuyển đến section cuối
            break;
        }
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
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/bb3a76a3-4213-4f7d-899e-96fc425975b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'vanilla-fullpage.js:198',message:'Wheel event received',data:{deltaX:e.deltaX,deltaY:e.deltaY,isScrolling:this.isScrolling,direction:this.direction},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'H'})}).catch(()=>{});
      // #endregion

      // Nếu đang scroll, bỏ qua
      if (this.isScrolling) return;

      // Debounce: đợi 50ms trước khi xử lý scroll tiếp theo
      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => {
        // Xử lý theo hướng scroll
        if (this.direction === 'horizontal') {
          // Horizontal: xử lý deltaX và deltaY tùy theo config
          let delta;
          if (this.allowVerticalScrollInHorizontal) {
            // Hỗ trợ cả deltaX (cuộn ngang) và deltaY (cuộn dọc)
            // Ưu tiên deltaX nếu có, nếu không thì dùng deltaY
            delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
          } else {
            // Chỉ hỗ trợ deltaX (cuộn ngang)
            delta = e.deltaX;
          }
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/bb3a76a3-4213-4f7d-899e-96fc425975b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'vanilla-fullpage.js:217',message:'Processing horizontal wheel',data:{delta:delta,deltaX:e.deltaX,deltaY:e.deltaY,currentIndex:this.currentIndex,sectionsLength:this.sections.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'I'})}).catch(()=>{});
          // #endregion
          if (Math.abs(delta) > 10) { // Chỉ xử lý nếu delta đủ lớn
            if (delta > 0) {
              // Scroll sang phải hoặc xuống -> di chuyển đến section tiếp theo
              // #region agent log
              fetch('http://127.0.0.1:7244/ingest/bb3a76a3-4213-4f7d-899e-96fc425975b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'vanilla-fullpage.js:223',message:'Calling moveDown',data:{currentIndex:this.currentIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'K'})}).catch(()=>{});
              // #endregion
              this.moveDown();
            } else if (delta < 0) {
              // Scroll sang trái hoặc lên -> di chuyển về section trước
              // #region agent log
              fetch('http://127.0.0.1:7244/ingest/bb3a76a3-4213-4f7d-899e-96fc425975b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'vanilla-fullpage.js:228',message:'Calling moveUp',data:{currentIndex:this.currentIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'L'})}).catch(()=>{});
              // #endregion
              this.moveUp();
            }
          }
        } else {
          // Vertical: sử dụng deltaY (mặc định)
          const delta = e.deltaY;
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/bb3a76a3-4213-4f7d-899e-96fc425975b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'vanilla-fullpage.js:232',message:'Processing vertical wheel',data:{delta:delta},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'J'})}).catch(()=>{});
          // #endregion
          if (delta > 0) {
            // Scroll xuống
            this.moveDown();
          } else if (delta < 0) {
            // Scroll lên
            this.moveUp();
          }
        }
      }, 50);
    }, { passive: true }); // passive: true để tăng performance
  }

  /**
   * Thiết lập touch/swipe cho mobile
   * @description Hỗ trợ swipe lên/xuống trên thiết bị cảm ứng
   * @private
   */
  setupTouch() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    // Lưu vị trí bắt đầu touch
    document.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    // Xử lý khi kết thúc touch
    document.addEventListener('touchend', (e) => {
      if (this.isScrolling) return;
      
      touchEndX = e.changedTouches[0].clientX;
      touchEndY = e.changedTouches[0].clientY;

      if (this.direction === 'horizontal') {
        // Horizontal: xử lý theo trục X
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 50) {
          if (diff > 0) {
            // Swipe sang trái -> di chuyển đến section tiếp theo
            this.moveDown();
          } else {
            // Swipe sang phải -> di chuyển về section trước
            this.moveUp();
          }
        }
      } else {
        // Vertical: xử lý theo trục Y (mặc định)
        const diff = touchStartY - touchEndY;
        if (Math.abs(diff) > 50) {
          if (diff > 0) {
            // Swipe lên -> di chuyển xuống
            this.moveDown();
          } else {
            // Swipe xuống -> di chuyển lên
            this.moveUp();
          }
        }
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

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/bb3a76a3-4213-4f7d-899e-96fc425975b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'vanilla-fullpage.js:343',message:'goToSection called',data:{fromIndex:this.currentIndex,toIndex:index,direction:this.direction},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'M'})}).catch(()=>{});
    // #endregion

    // Bắt đầu scroll animation
    this.isScrolling = true;
    const prevIndex = this.currentIndex;
    this.currentIndex = index;

    // Cập nhật classes và transform cho tất cả sections
    this.sections.forEach((section, i) => {
      // Xóa tất cả classes cũ
      section.classList.remove('active', 'prev', 'next');
      
      if (i === index) {
        // Section hiện tại: active (ở giữa màn hình)
        section.classList.add('active');
        // Apply transform trực tiếp - đảm bảo transition hoạt động
        if (this.direction === 'horizontal') {
          // Horizontal: transform trên section (giống test file)
          section.style.transform = 'translateX(0)';
          section.style.transition = 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.6s ease, visibility 0.6s ease';
          // Z-index tăng dần để tạo hiệu ứng đè lên nhau (section sau đè lên section trước)
          section.style.zIndex = String(i + 1);
        } else {
          section.style.transform = 'translateY(0)';
          section.style.transition = 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.6s ease, visibility 0.6s ease';
          section.style.zIndex = String(i + 1);
        }
        section.style.opacity = '1';
        section.style.visibility = 'visible';
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
            
            // #region agent log
            const computedStyle = window.getComputedStyle(child);
            const computedStyleSection = window.getComputedStyle(section);
            fetch('http://127.0.0.1:7244/ingest/bb3a76a3-4213-4f7d-899e-96fc425975b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'vanilla-fullpage.js:415',message:'Active section content setup',data:{sectionIndex:index,sectionClasses:section.className,sectionTransform:section.style.transform,sectionOpacity:section.style.opacity,sectionVisibility:section.style.visibility,sectionComputedOpacity:computedStyleSection.opacity,sectionComputedVisibility:computedStyleSection.visibility,childTag:child.tagName,childClasses:child.className,childOpacity:child.style.opacity,childVisibility:child.style.visibility,childComputedDisplay:computedStyle.display,childComputedOpacity:computedStyle.opacity,childComputedVisibility:computedStyle.visibility,childrenCount:child.children.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run5',hypothesisId:'P'})}).catch(()=>{});
            // #endregion
          }
        });
      } else if (i < index) {
        // Sections trước đó: prev
        section.classList.add('prev');
        // Apply transform trực tiếp - đảm bảo transition hoạt động
        if (this.direction === 'horizontal') {
          // Horizontal: transform trên section (giống test file)
          section.style.transform = 'translateX(-100vw)';
          section.style.transition = 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.6s ease, visibility 0.6s ease';
          // Giữ z-index để section vẫn đè lên nhau khi transition
          section.style.zIndex = String(i + 1);
        } else {
          section.style.transform = 'translateY(-100%)';
          section.style.transition = 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.6s ease, visibility 0.6s ease';
          section.style.zIndex = String(i + 1);
        }
        section.style.opacity = '0';
        section.style.visibility = 'hidden';
      } else {
        // Sections sau: next
        section.classList.add('next');
        // Apply transform trực tiếp - đảm bảo transition hoạt động
        if (this.direction === 'horizontal') {
          // Horizontal: transform trên section (giống test file)
          section.style.transform = 'translateX(100vw)';
          section.style.transition = 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.6s ease, visibility 0.6s ease';
          // Z-index cao hơn để section sau đè lên section trước khi transition
          section.style.zIndex = String(i + 1);
        } else {
          section.style.transform = 'translateY(100%)';
          section.style.transition = 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.6s ease, visibility 0.6s ease';
          section.style.zIndex = String(i + 1);
        }
        section.style.opacity = '0';
        section.style.visibility = 'hidden';
      }
    });

    // #region agent log
    const activeSection = this.sections[index];
    const computedStyle = activeSection ? window.getComputedStyle(activeSection) : null;
    fetch('http://127.0.0.1:7244/ingest/bb3a76a3-4213-4f7d-899e-96fc425975b0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'vanilla-fullpage.js:368',message:'After goToSection classes update',data:{activeSectionTransform:computedStyle?.transform,activeSectionClasses:activeSection?.className,prevSectionClasses:this.sections[Math.max(0,index-1)]?.className,nextSectionClasses:this.sections[Math.min(this.sections.length-1,index+1)]?.className},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'N'})}).catch(()=>{});
    // #endregion

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

