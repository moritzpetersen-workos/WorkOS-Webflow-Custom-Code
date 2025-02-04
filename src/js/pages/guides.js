(() => {
  // Select all h2 headings and the TOC container
  const headings = document.querySelectorAll(".post-rt h2");
  const toc = document.querySelector(".post-toc-wrap");
  const tocInner = document.querySelector(".post-toc-inner");

  // If there are fewer than 2 h2 headings or no TOC container, hide the TOC and exit
  if (headings.length < 2 || !toc) {
    if (tocInner) {
      tocInner.style.display = "none";
    }
    return;
  }

  // Count occurrences of heading texts (for handling duplicates)
  const headingCounts = {};

  // Pre-count occurrences for each heading
  headings.forEach((heading) => {
    const text = heading.textContent.trim();
    headingCounts[text] = (headingCounts[text] || 0) + 1;
  });

  // Track how many of each heading we've already used (for suffixes)
  const usedCounts = {};

  // Helper function to slugify a heading
  const createSlug = (text) => {
    const baseSlug = text
      .toLowerCase()
      .trim()
      .replace(/^[\d.]+\s*/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // If heading is unique
    if (headingCounts[text] === 1) {
      return baseSlug;
    }

    // Otherwise append numeric suffix
    usedCounts[text] = (usedCounts[text] || 0) + 1;
    return `${baseSlug}-${usedCounts[text]}`;
  };

  // Hardcode the introduction slug to avoid accidental suffixes
  const introSlug = "introduction";

  // Create the introduction section
  const introSection = document.createElement("div");
  introSection.classList.add("article-content-section");
  introSection.id = introSlug;

  // Wrap headings' content in .article-content-section blocks
  headings.forEach((heading) => {
    const slug = createSlug(heading.textContent);

    const section = document.createElement("div");
    section.classList.add("article-content-section");
    section.id = slug;

    // Insert the wrapper before the heading and move heading inside it
    heading.parentNode.insertBefore(section, heading);
    section.appendChild(heading);

    // Move subsequent siblings into this section until hitting another h2
    let nextEl = section.nextSibling;
    while (nextEl && !nextEl.matches("h2")) {
      const currentEl = nextEl;
      nextEl = nextEl.nextSibling;
      section.appendChild(currentEl);
    }
  });

  // Insert the introduction section at the very top
  const content = document.querySelector(".post-rt");
  if (content) {
    content.insertBefore(introSection, content.firstChild);

    // Move everything before the first heading into the introduction section
    if (headings.length > 0) {
      const firstHeadingSection = headings[0].parentNode;
      let currentNode = content.firstChild;

      while (currentNode && currentNode !== firstHeadingSection) {
        const nextNode = currentNode.nextSibling;
        if (currentNode !== introSection && !currentNode.matches("h2")) {
          introSection.appendChild(currentNode);
        }
        currentNode = nextNode;
      }
    }
  }

  // Build the TOC
  const list = document.createElement("ul");
  list.classList.add("toc-list");
  tocInner.appendChild(list);

  // Add the Introduction item
  const introItem = document.createElement("li");
  introItem.classList.add("toc-item");

  const introLink = document.createElement("a");
  introLink.textContent = "Introduction";
  introLink.href = `#${introSlug}`;
  introLink.classList.add("toc-a");
  introLink.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    updateActiveLink(introSection);
  });

  introItem.appendChild(introLink);
  list.appendChild(introItem);

  // Set introduction as active immediately after creating it
  introItem.classList.add("active");
  let currentActiveLink = introLink;

  // Create ToC entries for each heading
  headings.forEach((heading) => {
    const text = heading.textContent.trim();
    const slug = createSlug(text);

    heading.parentElement.id = slug; // ensure the wrapper has matching id

    const li = document.createElement("li");
    li.classList.add("toc-item");

    const a = document.createElement("a");
    a.textContent = text;
    a.href = `#${slug}`;
    a.classList.add("toc-a");

    li.appendChild(a);
    list.appendChild(li);
  });

  // Set expanded height for all toc links at once
  const tocLinks = tocInner.querySelectorAll(".toc-a");

  // Calculate and store heights
  requestAnimationFrame(() => {
    tocLinks.forEach((link) => {
      const height = link.offsetHeight;
      link.style.setProperty("--expanded-link-height", `${height}px`);
    });
  });

  // Prepare sections for intersection-observer
  const sections = document.querySelectorAll(".article-content-section");
  let isManualScroll = false;
  let manualScrollTimeout;

  const updateActiveLink = (section) => {
    if (!section) return;
    const newLink = toc.querySelector(`a[href="#${section.id}"]`);
    if (newLink === currentActiveLink) return;

    // Use requestAnimationFrame to ensure smooth class transitions
    requestAnimationFrame(() => {
      // Remove active class from old link
      if (currentActiveLink) {
        currentActiveLink.closest(".toc-item")?.classList.remove("active");
      }

      // Add active class to new link in next frame
      requestAnimationFrame(() => {
        if (newLink) {
          newLink.closest(".toc-item")?.classList.add("active");
          currentActiveLink = newLink;
        }
      });
    });
  };

  // Smooth scroll link handler
  const handleClick = (event) => {
    event.stopPropagation();
    const link = event.target.closest("a");
    if (!link || !link.hash) return;

    // Skip the introduction cause we do custom scroll there
    if (link.hash === `#${introSlug}`) return;

    event.preventDefault();
    const targetSection = document.querySelector(link.hash);
    if (!targetSection) return;

    isManualScroll = true;
    clearTimeout(manualScrollTimeout);
    manualScrollTimeout = setTimeout(() => {
      isManualScroll = false;
    }, 1200);

    targetSection.scrollIntoView({ behavior: "smooth" });
    updateActiveLink(targetSection);
  };

  toc.addEventListener("click", handleClick);

  // Intersection Observer for active link updates
  const observer = new IntersectionObserver(
    (entries) => {
      if (isManualScroll) return;

      // Sort entries by vertical position
      const sortedEntries = entries.sort(
        (a, b) =>
          a.target.getBoundingClientRect().top -
          b.target.getBoundingClientRect().top
      );

      for (const entry of sortedEntries) {
        const { isIntersecting, target, boundingClientRect, rootBounds } =
          entry;

        // Ignore if not near viewport center
        if (
          !rootBounds ||
          rootBounds.bottom - boundingClientRect.bottom > rootBounds.bottom / 2
        ) {
          continue;
        }

        if (isIntersecting) {
          updateActiveLink(target);
          break;
        } else {
          // When scrolling up, highlight the previous section
          const sectionArray = Array.from(sections);
          const currentIndex = sectionArray.indexOf(target);
          if (boundingClientRect.top > 0) {
            // The section is above the viewport
            const previousSection = sectionArray[Math.max(currentIndex - 1, 0)];
            updateActiveLink(previousSection);
            break;
          }
        }
      }
    },
    {
      threshold: [0],
      rootMargin: "0% 0% -50% 0%",
    }
  );

  // Enable global smooth scrolling after load
  requestAnimationFrame(() => {
    document.documentElement.style.scrollBehavior = "smooth";
  });

  // Observe each main section
  sections.forEach((section) => {
    observer.observe(section);
  });

  // Toggle .toc-collapsed based on article-header visibility
  const articleHeader = document.querySelector(".article-header");
  if (articleHeader) {
    const headerObserver = new IntersectionObserver(
      ([entry]) => {
        tocInner.classList.toggle("toc-collapsed", !entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: "-20px 0px 0px 0px",
      }
    );
    headerObserver.observe(articleHeader);
  }
})();
