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


// Skills progress bars: initialize widths from `data-percent` and animate
(function(){
	function initSkillProgress(){
		const bars = Array.from(document.querySelectorAll('.progress-bar'));
		bars.forEach((bar, i) => {
			const percent = Math.max(0, Math.min(100, Number(bar.getAttribute('data-percent') || 0)));
			const progress = bar.closest('.progress');
			const skill = bar.closest('.skill');
			if(progress) progress.setAttribute('aria-valuenow', '0');
			// staggered animation so multiple bars don't move at once
			setTimeout(()=>{
				bar.style.width = percent + '%';
				if(progress) progress.setAttribute('aria-valuenow', String(percent));
				// keep visible percent label in-sync if present
				const pctLabel = skill ? skill.querySelector('.skill-percent') : null;
				if(pctLabel) pctLabel.textContent = percent + '%';
			}, 120 + i * 120);
		});
	}

	if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSkillProgress);
	else initSkillProgress();
})();


/* Timeline: render from data array and add entrance animations */
(function(){
	const experiences = [
		{
			title: 'Python 選修課 - 永春高中',
			start: '2022',
			end: null,
			periodLabel: '高一上學期',
			description: '忘記課程的名稱是什麼了，大概就是簡單的學習 Python，並且做出自己的軟體（我記得我是做出一個溫標轉換器）。'
		},
		{
			title: '資訊研究社 - 永春高中',
			start: '2022',
			end: '2023',
			periodLabel: '高一至高二',
			description: '在資訊研究社中學習到了 App Inventor，不過只是簡單介紹，當時的社課認真聽的人很少所以進度很慢。'
		},
		{
			title: '資訊科技 - 永春高中',
			start: '2023',
			end: '2025',
			periodLabel: '高二至高三',
			description: '資訊科技課有學過 C++，並且有寫出一個筆記 App，那時的檔案也還留著。'
		}
	];

	function createItem(exp){
		const article = document.createElement('article');
		article.className = 'timeline-item';

		const h3 = document.createElement('h3');
		h3.textContent = exp.title;
		article.appendChild(h3);

		const meta = document.createElement('p');
		meta.className = 'meta';
		if(exp.end){
			meta.innerHTML = `<time datetime="${exp.start}">${exp.start}</time> - <time datetime="${exp.end}">${exp.end}</time> · ${exp.periodLabel}`;
		} else {
			meta.innerHTML = `<time datetime="${exp.start}">${exp.start}</time> · ${exp.periodLabel}`;
		}
		article.appendChild(meta);

		const p = document.createElement('p');
		p.textContent = exp.description;
		article.appendChild(p);

		return article;
	}

	function renderTimeline(){
		const container = document.getElementById('timeline');
		if(!container) return;
		// clear existing
		container.innerHTML = '';
		experiences.forEach(exp => container.appendChild(createItem(exp)));

		// entrance observer
		const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const items = Array.from(container.querySelectorAll('.timeline-item'));

		if(prefersReduced){
			items.forEach(i => i.classList.add('in-view'));
			return;
		}

		const io = new IntersectionObserver((entries)=>{
			entries.forEach(en => {
				if(en.isIntersecting){
					en.target.classList.add('in-view');
					// optional: unobserve once visible
					io.unobserve(en.target);
				}
			});
		}, {root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.12});

		items.forEach(i => io.observe(i));
	}

	if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderTimeline);
	else renderTimeline();
})();