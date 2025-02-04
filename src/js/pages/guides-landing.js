import { animate, spring } from "motion";

class BookModal {
  constructor() {
    // Core elements
    this.booksContainer = document.querySelector(".guides-books-container");
    this.booksList = document.querySelector(".guides-book-list");
    this.books = this.booksList.querySelectorAll(".guides-book-wrap");

    this.modalsWrapper = document.querySelector(".guides-modals");
    this.modalBg = document.querySelector(".guides-modal-bg");
    this.closeBg = document.querySelector(".guides-modal-close-bg");
    this.modalsList = document.querySelector(".guides-modals-list");
    this.modals = document.querySelectorAll(".guides-modal");

    this.modalSliderBtnLeft = document.querySelector(
      ".guides-modal-slider-arrow.cc-left"
    );
    this.modalSliderBtnRight = document.querySelector(
      ".guides-modal-slider-arrow.cc-right"
    );

    this.booksList.removeAttribute("role");

    // State
    this.isOpen = false;
    this.currentIndex = 0;
    this.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    // Create a map of book IDs to modal indices
    this.modalIndices = new Map();
    this.modals.forEach((modal, index) => {
      this.modalIndices.set(modal.dataset.modal, index);
    });

    // Constants
    this.MODAL_WIDTH = 1014;
    this.MODAL_GAP = 56;

    // Add property to track if animation is in progress
    this.isAnimating = false;
    this.isOpeningOrClosing = false;

    /*
    // Set will-change on elements that animate frequently
    this.modalsList.style.willChange = "transform";
    this.modals.forEach((modal) => {
      const book = modal.querySelector(".guides-modal-book");
      book.style.willChange = "transform";
    });
    */

    // Add spring animation settings
    this.springs = {
      opening: {
        type: spring,
        visualDuration: 0.38,
        bounce: 0.24,
      },
      closing: {
        type: spring,
        visualDuration: 0.3,
        bounce: 0.24,
      },
      navigation: {
        type: spring,
        duration: 0.9,
        bounce: 0.14,
        velocity: 1000,
      },
    };

    // Add initial arrow states
    this.updateArrowVisibility(0);

    this.init();
  }

  init() {
    // Store initial book positions
    this.updatePositions();

    // Event listeners
    this.books.forEach((book) => {
      book.addEventListener("click", () => this.open(book));
    });
    /*
    // Add hover listeners for modal list and all button
    this.modals.forEach((modal) => {
      const modalList = modal.querySelector(".guides-modal-list");
      const modalAll = modal.querySelector(".guide-modal-all");
      const modalBook = modal.querySelector(".guides-modal-book");

      modalList?.addEventListener("mouseenter", () =>
        modalBook?.classList.add("open")
      );
      modalList?.addEventListener("mouseleave", () =>
        modalBook?.classList.remove("open")
      );

      modalAll?.addEventListener("mouseenter", () =>
        modalBook?.classList.add("all")
      );
      modalAll?.addEventListener("mouseleave", () =>
        modalBook?.classList.remove("all")
      );
    });*/

    this.modals.forEach((modal) => {
      const closeBtn = modal.querySelector(".guides-modal-close");
      closeBtn?.addEventListener("click", () => this.close());
    });

    this.modalBg.addEventListener("click", () => this.close());
    this.closeBg.addEventListener("click", () => this.close());

    // Keyboard navigation
    document.addEventListener("keydown", (e) => {
      if (!this.isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        this.close();
      }
      if (e.key === "ArrowLeft") this.navigate("prev");
      if (e.key === "ArrowRight") this.navigate("next");
    });

    this.modalSliderBtnLeft.addEventListener("click", () =>
      this.navigate("prev")
    );
    this.modalSliderBtnRight.addEventListener("click", () =>
      this.navigate("next")
    );

    // Handle resize
    window.addEventListener("resize", () => {
      if (this.isOpen) {
        this.updateModalPosition();
      }
    });
  }

  getBookMetrics(book) {
    const rect = book.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }

  updatePositions() {
    // Only needed for resize handling now
    if (this.isOpen) {
      this.updateModalPosition();
    }
  }

  updateArrowVisibility(index) {
    this.modalSliderBtnLeft.classList.toggle("is-active", index > 0);
    this.modalSliderBtnRight.classList.toggle(
      "is-active",
      index < this.modals.length - 1
    );
  }

  async open(clickedBook) {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.isOpeningOrClosing = true;
    document.body.style.overflow = "hidden";
    this.modalsWrapper.classList.add("is-opened");

    this.isOpen = true;
    const bookId = clickedBook.dataset.bookId;
    const targetModal = document.querySelector(
      `.guides-modal[data-modal="${bookId}"]`
    );
    if (!targetModal) return;

    this.currentIndex = this.modalIndices.get(bookId);
    this.updateArrowVisibility(this.currentIndex);

    // Store the clicked book's position for later
    this.lastOpenedBookScroll = {
      left: this.booksContainer.scrollLeft,
      bookLeft: clickedBook.offsetLeft,
    };

    // Set opacity on the wrap element instead of inner
    requestAnimationFrame(() => {
      clickedBook.style.opacity = "0";
      clickedBook.style.transform = "";
    });
    // 1. First: Show modal but keep it invisible
    this.modalsWrapper.style.display = "flex";
    this.modalsWrapper.style.opacity = "0";

    // Reset all modals and hide their content/books except for the target
    this.modals.forEach((modal, index) => {
      modal.style.opacity = "1";
      modal.style.transform = "";
      const modalContent = modal.querySelector(".guides-modal-content");
      const modalBookWrap = modal.querySelector(
        ".guides-modal-book .guides-book-wrap"
      );
      modalContent.style.opacity = index === this.currentIndex ? "1" : "0";
      modalBookWrap.style.opacity = index === this.currentIndex ? "1" : "0";
    });

    // Position modal list
    this.modalsList.style.transform = `translateX(-${
      this.currentIndex * (this.MODAL_WIDTH + this.MODAL_GAP)
    }px)`;

    // Set initial state of adjacent modals
    const prevModal = this.modals[this.currentIndex - 1];
    const nextModal = this.modals[this.currentIndex + 1];

    if (prevModal) {
      prevModal.style.opacity = "0";
      prevModal.style.transform = "translateX(-100px)";
    }
    if (nextModal) {
      nextModal.style.opacity = "0";
      nextModal.style.transform = "translateX(100px)";
    }

    // 2. Batch DOM reads - get all measurements before any transforms
    const measurements = {
      book: this.getBookMetrics(clickedBook),
      modal: targetModal.getBoundingClientRect(),
      modalBook: targetModal
        .querySelector(".guides-modal-book")
        .getBoundingClientRect(),
      modalInner: targetModal
        .querySelector(".guides-modal-inner")
        .getBoundingClientRect(),
    };

    const modalBookY = measurements.modalBook.top;

    // Only animate books that are visible
    const otherBooksAnimations = Array.from(
      this.booksList.querySelectorAll(".guides-book-wrap")
    )
      .filter((book) => book !== clickedBook)
      .map((book) => {
        const modalIndex = this.modalIndices.get(book.dataset.bookId);
        const targetX =
          (modalIndex - this.currentIndex) *
          (this.MODAL_WIDTH + this.MODAL_GAP);
        const bookRect = book.getBoundingClientRect();
        const deltaY = modalBookY - bookRect.top;

        const bookInner = book.querySelector(".guides-book-inner");

        return animate(
          bookInner,
          this.isSafari
            ? {
                transform: [
                  "translate(0px, 0px)",
                  `translate(${targetX}px, ${deltaY}px)`,
                ],
                opacity: [1, 0],
              }
            : {
                x: [0, targetX],
                y: [0, deltaY],
                opacity: [1, 0],
              },
          this.springs.opening
        );
      });

    const elements = {
      modal: targetModal,
      modalBook: targetModal.querySelector(".guides-modal-book"),
      modalInner: targetModal.querySelector(".guides-modal-inner"),
      modalBookInner: targetModal.querySelector(
        ".guides-modal-book .guides-book"
      ),
    };

    // 3. Calculate all transforms
    const transforms = {
      book: {
        dx: measurements.book.left - measurements.modalBook.left,
        dy: measurements.book.top - measurements.modalBook.top,
        scale: measurements.book.width / elements.modalBook.offsetWidth,
      },
      inner: {
        dx: measurements.book.left - measurements.modalInner.left,
        dy: measurements.book.top - measurements.modalInner.top,
        scale: measurements.book.width / this.MODAL_WIDTH,
      },
    };

    // 4. Batch DOM writes - set initial states
    elements.modalBook.style.cssText = `
      transform-origin: top left;
      transform: translate(${transforms.book.dx}px, ${transforms.book.dy}px) scale(${transforms.book.scale});
      opacity: 1;
    `;

    elements.modalBookInner.style.transform = "rotateY(-40deg)";

    elements.modalInner.style.cssText = `
      transform-origin: top left;
      transform: translate(${transforms.inner.dx}px, ${transforms.inner.dy}px) scale(${transforms.inner.scale});
      opacity: 0;
    `;

    // 5. Force single reflow before animation
    elements.modal.offsetHeight;

    // 6. Make wrapper visible
    this.modalsWrapper.style.opacity = "1";

    // 7. Start animations
    try {
      await Promise.all(
        [
          animate(this.modalBg, { opacity: [0, 1] }, { duration: 0.38 }),
          ...otherBooksAnimations,
          prevModal &&
            animate(
              prevModal,
              {
                opacity: [0, 1],
                transform: ["translateX(-100px)", "translateX(0px)"],
              },
              { duration: 0.3, delay: 0.2 }
            ),
          nextModal &&
            animate(
              nextModal,
              {
                opacity: [0, 1],
                transform: ["translateX(100px)", "translateX(0px)"],
              },
              { duration: 0.3, delay: 0.2 }
            ),
          animate(
            elements.modalBook,
            {
              transform: [
                `translate(${transforms.book.dx}px, ${transforms.book.dy}px) scale(${transforms.book.scale})`,
                "translate(0px, 0px) scale(1)",
              ],
              opacity: [1, 1],
            },
            this.springs.opening
          ),
          animate(
            elements.modalBookInner,
            {
              rotateY: [-40, 0],
              scale: [1.05, 1],
            },
            this.springs.opening
          ),
          animate(
            elements.modalInner,
            {
              transform: [
                `translate(${transforms.inner.dx}px, ${transforms.inner.dy}px) scale(${transforms.inner.scale})`,
                "translate(0px, 0px) scale(1)",
              ],
              opacity: [0, 1],
            },
            this.springs.opening
          ),
        ].filter(Boolean)
      );
    } finally {
      this.isAnimating = false;
      this.isOpeningOrClosing = false;
    }
  }

  async close() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.isOpeningOrClosing = true;

    // Remove opened class at start of close
    this.modalsWrapper.classList.remove("is-opened");

    const currentModal = this.modals[this.currentIndex];
    const prevModal = this.modals[this.currentIndex - 1];
    const nextModal = this.modals[this.currentIndex + 1];
    const bookId = currentModal.dataset.modal;
    const originalBook = Array.from(this.books).find(
      (book) => book.dataset.bookId === bookId
    );
    const originalBookInner = originalBook?.querySelector(".guides-book-inner");

    // Ensure book is in view by adjusting scroll if needed
    if (originalBook) {
      const containerWidth = this.booksContainer.offsetWidth;
      const bookLeft = originalBook.offsetLeft;
      const bookWidth = originalBook.offsetWidth;
      const bookRight = bookLeft + bookWidth;
      const scrollLeft = this.booksContainer.scrollLeft;
      const scrollRight = scrollLeft + containerWidth;

      // If book is not fully visible, adjust scroll
      if (bookLeft < scrollLeft || bookRight > scrollRight) {
        this.booksContainer.scrollLeft = Math.min(
          bookLeft,
          bookRight - containerWidth
        );
      }
    }

    // Wait for scroll to complete and browser to update
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });

    // Reset book inner state before measurements
    if (originalBookInner) {
      originalBookInner.style.transform = "";
      originalBookInner.style.opacity = "0";
    }

    const modalBookY = currentModal
      .querySelector(".guides-modal-book")
      .getBoundingClientRect().top;

    // Set initial positions for ALL books before animation
    const otherBooksAnimations = Array.from(this.books)
      .filter((book) => book !== originalBook)
      .map((book) => {
        const modalIndex = this.modalIndices.get(book.dataset.bookId);
        const targetX =
          (modalIndex - this.currentIndex) *
          (this.MODAL_WIDTH + this.MODAL_GAP);
        const bookRect = book.getBoundingClientRect();
        const startY = modalBookY - bookRect.top;

        const bookInner = book.querySelector(".guides-book-inner");
        book.style.opacity = "1";
        bookInner.style.opacity = "0";

        return animate(
          bookInner,
          this.isSafari
            ? {
                transform: [
                  `translate(${targetX}px, ${startY}px)`,
                  "translate(0px, 0px)",
                ],
                opacity: [0, 1],
              }
            : {
                x: [targetX, 0],
                y: [startY, 0],
                opacity: [0, 1],
              },
          {
            type: "spring",
            visualDuration: 0.35,
            bounce: 0.15,
          }
        );
      });

    // Batch all DOM reads
    const measurements = {
      book: this.getBookMetrics(originalBook),
      modalBook: currentModal
        .querySelector(".guides-modal-book")
        .getBoundingClientRect(),
      modalInner: currentModal
        .querySelector(".guides-modal-inner")
        .getBoundingClientRect(),
    };

    const elements = {
      modalBook: currentModal.querySelector(".guides-modal-book"),
      modalInner: currentModal.querySelector(".guides-modal-inner"),
    };

    // Calculate all transforms
    const transforms = {
      book: {
        dx: measurements.book.left - measurements.modalBook.left,
        dy: measurements.book.top - measurements.modalBook.top,
        scale: measurements.book.width / elements.modalBook.offsetWidth,
      },
      inner: {
        dx: measurements.book.left - measurements.modalInner.left,
        dy: measurements.book.top - measurements.modalInner.top,
        scale: measurements.book.width / this.MODAL_WIDTH,
      },
    };

    // Set transform origins before animation
    elements.modalBook.style.transformOrigin = "top left";
    elements.modalInner.style.transformOrigin = "top left";

    // Single reflow
    currentModal.offsetHeight;

    try {
      await Promise.all(
        [
          ...otherBooksAnimations,
          prevModal &&
            animate(
              prevModal,
              {
                opacity: [1, 0],
                transform: [
                  "translateX(0px) scale(1)",
                  "translateX(100px) scale(0.9)",
                ],
              },
              { duration: 0.15 }
            ),
          nextModal &&
            animate(
              nextModal,
              {
                opacity: [1, 0],
                transform: [
                  "translateX(0px) scale(1)",
                  "translateX(-100px) scale(0.9)",
                ],
              },
              { duration: 0.15 }
            ),
          animate(
            elements.modalBook,
            {
              transform: [
                "translate(0px, 0px) scale(1)",
                `translate(${transforms.book.dx}px, ${transforms.book.dy}px) scale(${transforms.book.scale})`,
              ],
            },
            this.springs.closing
          ),
          animate(
            elements.modalInner,
            {
              transform: [
                "translate(0px, 0px) scale(1)",
                `translate(${transforms.inner.dx}px, ${transforms.inner.dy}px) scale(${transforms.inner.scale})`,
              ],
              opacity: [1, 0],
            },
            this.springs.closing
          ),
          animate(this.modalBg, { opacity: [1, 0] }, { duration: 0.3 }),
        ].filter(Boolean)
      );
    } finally {
      this.isAnimating = false;
      this.isOpeningOrClosing = false;
      requestAnimationFrame(() => {
        this.modalsWrapper.style.display = "none";
        this.isOpen = false;
        elements.modalBook.style.cssText = "";
        elements.modalInner.style.cssText = "";

        // Reset ALL books, regardless of visibility
        Array.from(this.books).forEach((book) => {
          const bookInner = book.querySelector(".guides-book-inner");
          book.style.opacity = "1";
          book.style.transform = "";
          bookInner.style.opacity = "1";
          bookInner.style.transform = "";
        });

        document.body.style.overflow = "";
      });
    }
  }

  navigate(direction) {
    if (this.isOpeningOrClosing) return;

    // Allow interruption of navigation animations
    this.isAnimating = true;

    const newIndex =
      direction === "prev"
        ? Math.max(0, this.currentIndex - 1)
        : Math.min(this.modals.length - 1, this.currentIndex + 1);

    if (newIndex === this.currentIndex) return;

    this.updateArrowVisibility(newIndex);

    const currentModal = this.modals[this.currentIndex];
    const nextModal = this.modals[newIndex];
    const currentContent = currentModal.querySelector(".guides-modal-content");
    const currentBookWrap = currentModal.querySelector(
      ".guides-modal-book .guides-book-wrap"
    );
    const nextContent = nextModal.querySelector(".guides-modal-content");
    const nextBookWrap = nextModal.querySelector(
      ".guides-modal-book .guides-book-wrap"
    );

    // Hide next modal content initially
    nextContent.style.opacity = "0";
    nextBookWrap.style.opacity = "0";

    Promise.all([
      animate(
        this.modalsList,
        {
          x: [
            `${-this.currentIndex * (this.MODAL_WIDTH + this.MODAL_GAP)}px`,
            `${-newIndex * (this.MODAL_WIDTH + this.MODAL_GAP)}px`,
          ],
        },
        this.springs.navigation
      ),
      animate(
        [currentContent, currentBookWrap],
        { opacity: [1, 0] },
        { duration: 0.2 }
      ),
      animate(
        [nextContent, nextBookWrap],
        { opacity: [0, 1] },
        { duration: 0.2 }
      ),
    ]).finally(() => {
      this.isAnimating = false;
    });

    this.currentIndex = newIndex;
  }

  updateModalPosition() {
    // Update modal position when window resizes while open
    this.modalsList.style.transform = `translateX(-${
      this.currentIndex * (this.MODAL_WIDTH + this.MODAL_GAP)
    }px)`;
  }

  // Clean up when the component is destroyed
  destroy() {
    this.visibleBooksObserver.disconnect();
  }
}
document.addEventListener("keydown", function (event) {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
  }
});

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new BookModal();
});
