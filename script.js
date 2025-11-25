// Theme & header toggle: ensure buttons exist before binding
(function(){
	function initThemeAndHeaderToggle(){
		const toggle = document.getElementById('theme-toggle');
		const headerToggle = document.getElementById('header-toggle');
		const html = document.documentElement;

		function getPreferred(){
			const stored = localStorage.getItem('theme');
			if(stored) return stored === 'dark';
			return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
		}

		function apply(dark){
			if(dark) html.setAttribute('data-theme','dark');
			else html.setAttribute('data-theme','light');
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

		// header toggle control
		const headerEl = document.querySelector('.site-header');
		function setHeaderVisible(visible){
			if(!headerEl) return;
			if(visible){
				headerEl.classList.remove('hidden');
				document.documentElement.style.setProperty('--header-hidden','false');
				if(headerToggle) { headerToggle.textContent = '隱藏頂欄'; headerToggle.setAttribute('aria-pressed','true'); }
			} else {
				headerEl.classList.add('hidden');
				document.documentElement.style.setProperty('--header-hidden','true');
				if(headerToggle) { headerToggle.textContent = '顯示頂欄'; headerToggle.setAttribute('aria-pressed','false'); }
			}
			// update header height var (updateHeaderHeight handles hidden state)
			if(typeof updateHeaderHeight === 'function') updateHeaderHeight();
			localStorage.setItem('headerVisible', visible ? '1' : '0');
		}

		if(headerToggle){
			headerToggle.addEventListener('click', ()=>{
				const isVisible = !document.querySelector('.site-header').classList.contains('hidden');
				setHeaderVisible(!isVisible);
			});
		}
	}

	if(document.readyState === 'loading'){
		document.addEventListener('DOMContentLoaded', initThemeAndHeaderToggle);
	} else {
		initThemeAndHeaderToggle();
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

	// When clicking a nav link, set it active immediately to avoid race with observer
	navLinks.forEach(a => a.addEventListener('click', ()=>{
		navLinks.forEach(n=>n.classList.remove('active'));
		a.classList.add('active');
	}));

	// Scroll-based fallback: pick the section whose top is nearest the header bottom
	let ticking = false;
	function updateActiveByPosition(){
		const headerEl = document.querySelector('.site-header');
		const headerH = headerEl ? headerEl.offsetHeight : 0;
		let best = null;
		let bestDistance = Infinity;
		sections.forEach(s => {
			const rect = s.getBoundingClientRect();
			// consider sections that are at least partially visible
			if(rect.bottom <= headerH + 4) return; // scrolled past
			// distance from section top to header bottom
			const distance = Math.abs(rect.top - headerH);
			if(distance < bestDistance){ bestDistance = distance; best = s; }
		});
		if(best){
			navLinks.forEach(n=>n.classList.remove('active'));
			const link = document.querySelector('.main-nav a[href="#'+best.id+'"]');
			if(link) link.classList.add('active');
		}
		ticking = false;
	}

	window.addEventListener('scroll', ()=>{
		if(!ticking){
			ticking = true;
			requestAnimationFrame(updateActiveByPosition);
		}
	},{passive:true});

	// run once to set initial active link
	updateActiveByPosition();
  
	// Make header visually adapt when scrolled (add .scrolled when page is not at top)
	const header = document.querySelector('.site-header');
	function onScroll(){
		if(window.scrollY > 8) header.classList.add('scrolled');
		else header.classList.remove('scrolled');
	}
	window.addEventListener('scroll', onScroll, {passive:true});
	onScroll();
})();

// Calculate header height and set CSS variable so anchors offset correctly
(function(){
	const header = document.querySelector('.site-header');
	if(!header) return;

	function updateHeaderHeight(){
		// use offsetHeight to include padding/border
			// if header is hidden, set header-height to 0 so content fills top
			if(header.classList.contains('hidden')){
				document.documentElement.style.setProperty('--header-height', '0px');
				return;
			}

			const h = header.offsetHeight || 0;
			document.documentElement.style.setProperty('--header-height', h + 'px');
	}

	// update on load, resize and when images/fonts may change layout
	window.addEventListener('resize', updateHeaderHeight, {passive:true});
	window.addEventListener('load', ()=>{
		// restore saved header visibility preference
		const saved = localStorage.getItem('headerVisible');
		const headerVisible = saved === null ? true : saved === '1';
		if(!headerVisible) header.classList.add('hidden');
		updateHeaderHeight();
	});

	// observe mutations in header (in case its size changes due to dynamic content)
	const mo = new MutationObserver(updateHeaderHeight);
	mo.observe(header, {childList:true,subtree:true,attributes:true});

	// initial
	updateHeaderHeight();
})();