// Progressive enhancement: every publication and link works without JavaScript.
(() => {
  const toolbar = document.querySelector('.publication-toolbar');
  const buttons = [...document.querySelectorAll('[data-filter]')];
  const publications = [...document.querySelectorAll('.publication')];
  const count = document.querySelector('.publication-count');

  function filterPublications(year) {
    let visible = 0;
    publications.forEach((paper) => {
      paper.hidden = year !== 'all' && paper.dataset.year !== year;
      if (!paper.hidden) visible += 1;
    });
    buttons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.filter === year));
    });
    count.textContent = `${visible} selected publication${visible === 1 ? '' : 's'}`;
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => filterPublications(button.dataset.filter));
  });
  filterPublications('all');
  toolbar.hidden = false;

  // A direct paper link must stay reachable, even after filtering another year.
  function revealLinkedPublication() {
    const paper = publications.find((item) => `#${item.id}` === window.location.hash);
    if (paper?.hidden) {
      filterPublications('all');
      paper.scrollIntoView({ block: 'start' });
    }
  }
  window.addEventListener('hashchange', revealLinkedPublication);
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', () => {
      const paper = publications.find((item) => `#${item.id}` === link.hash);
      if (paper?.hidden) filterPublications('all');
    });
  });
  revealLinkedPublication();

  const navLinks = [...document.querySelectorAll('nav a')];
  const sections = navLinks.map((link) => document.querySelector(link.hash));
  let updatePending = false;
  function updateNavigation() {
    const headerHeight = document.querySelector('.site-header').offsetHeight;
    let current = sections[0];
    sections.forEach((section) => {
      if (section.getBoundingClientRect().top <= headerHeight + 90) current = section;
    });
    navLinks.forEach((link) => {
      if (link.hash === `#${current.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    updatePending = false;
  }
  window.addEventListener('scroll', () => {
    if (!updatePending) {
      updatePending = true;
      window.requestAnimationFrame(updateNavigation);
    }
  }, { passive: true });
  window.addEventListener('resize', updateNavigation);
  updateNavigation();
})();
