// Theme toggle: remember preference and apply immediately
(function(){
	const toggle = document.getElementById('theme-toggle');
	const html = document.documentElement;

	function getPreferred(){
		const stored = localStorage.getItem('theme');
		if(stored) return stored === 'dark';
		return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
	}

	function apply(dark){
		if(dark) html.setAttribute('data-theme','dark');
		else html.removeAttribute('data-theme');
		if(toggle){
			toggle.textContent = dark ? '☀️' : '🌙';
			toggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
		}
	}

	// initial
	apply(getPreferred());

	if(toggle){
		toggle.addEventListener('click', ()=>{
			const now = html.getAttribute('data-theme') === 'dark';
			apply(!now);
			localStorage.setItem('theme', !now ? 'dark' : 'light');
		});
	}
})();

// Smooth scroll and active nav highlighting
(function(){
	const navLinks = Array.from(document.querySelectorAll('.main-nav a.nav-link'));
	const sections = navLinks.map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);

	// Click handler: use smooth scroll and update aria
	navLinks.forEach(a => {
		a.addEventListener('click', (e)=>{
			const id = a.getAttribute('href').slice(1);
			const el = document.getElementById(id);
			if(el){
				e.preventDefault();
				el.scrollIntoView({behavior:'smooth', block:'start'});
				history.replaceState(null,'', '#'+id);
			}
		});
	});

	// IntersectionObserver for section in view — use ratios to pick the most visible section.
	// This is more robust when header is sticky or sections have varying heights.
	const visibility = new Map();
	const observer = new IntersectionObserver((entries) => {
		entries.forEach(entry => {
			visibility.set(entry.target.id, entry.intersectionRatio || 0);
		});

		// pick section id with highest intersectionRatio
		let bestId = null;
		let bestRatio = 0;
		for (const [id, ratio] of visibility.entries()) {
			if (ratio > bestRatio) {
				bestRatio = ratio;
				bestId = id;
			}
		}

		if (bestId) {
			navLinks.forEach(n => n.classList.remove('active'));
			const bestLink = document.querySelector('.main-nav a[href="#' + bestId + '"]');
			if (bestLink) bestLink.classList.add('active');
		}
	}, { root: null, rootMargin: '-10% 0px -40% 0px', threshold: [0, 0.1, 0.25, 0.5, 0.75] });

	sections.forEach(s => {
		visibility.set(s.id, 0);
		observer.observe(s);
	});
  
	// Make header visually adapt when scrolled (add .scrolled when page is not at top)
	const header = document.querySelector('.site-header');
	function onScroll(){
		if(window.scrollY > 8) header.classList.add('scrolled');
		else header.classList.remove('scrolled');
	}
	window.addEventListener('scroll', onScroll, {passive:true});
	onScroll();
})();
