/* === КОНФИГУРАЦИЯ ДАННЫХ === */
// Укажи здесь дату рождения: Год, Месяц (0 = Январь, 1 = Февраль...), День
const birthDate = new Date(2003, 0, 15); // Пример: 15 Января 2003

const timelineData = [
    {
        year: 2003,
        title: "Там, где рождается связь...",
        description: "Ты здесь еще сама почти ребенок, но в твоих глазах уже столько взрослой нежности и заботы. Я был крошечным, а ты стала моим первым проводником в этот огромный мир. Спасибо, что оберегала меня тогда и продолжаешь вдохновлять сейчас.",
        photos: [
            "det/det1.jpg",
            "det/det2.jpg",
            "det/det3.jpg",
            "det/det4.jpg",
            "det/det5.jpg",
            "det/det6.jpg",
            "det/det7.jpg"
        ]
    },
    {
        year: 2010,
        title: "Моей самой крутой старшей сестре",
        description: "Для меня ты всегда была тем человеком, на которого хотелось равняться. Я хоть и младший, но я видел, как тяжело ты порой шла к своим целям и сколько труда за всем этим стоит. Для меня ты всегда была самой умной и талантливой. Я просто очень рад, что у меня есть такая сестра. Пусть всё, о чем ты мечтаешь, обязательно сбывается, а я всегда буду за тебя горой!",
        photos: [
            "i/i1.jpg",
            "i/i2.jpg",
            "i/i3.jpg",
            "i/i4.jpg",
            "i/i5.jpg"
        ]
    },
    {
        year: 2018,
        title: "Самые родные",
        description: "В тебе столько маминой доброты и той же внутренней силы. И всё же, ты для меня второй главный пример. Моя старшая сестра, которая всегда поймет, даже если я молчу. Смотрю на тебя и просто радуюсь, что ты у меня такая.",
        photos: [
            "mom/mom1.jpg",
            "mom/mom2.jpg",
            "mom/mom3.jpg",
            "mom/mom4.jpg",
            "mom/mom5.jpg",
            "mom/mom6.jpg"
        ]
    },
    {
        year: 2026,
        title: "Мой главный пример и опора",
        description: "На этих фото ты уже такая, какая сейчас, взрослая, уверенная и по-настоящему красивая. Но за этой красотой я вижу гораздо больше. Я никогда не забуду, сколько ты для меня сделала. Когда было трудно с учебой, когда я метался с поступлением, ты всегда была рядом. Ты тратила свое время, делилась опытом и буквально за руку тянула меня вверх. Всё, чего я добиваюсь сейчас, это во многом и твоя заслуга тоже. Спасибо тебе за каждое твое слово и за то, что ты так много в меня вложила. Я хоть и младший, но всегда вижу и очень ценю твою поддержку. Ты лучшая, и я сделаю всё, чтобы ты тоже могла мной гордиться",
        photos: [
            "y/y1.jpg",
            "y/y2.jpg",
            "y/y3.jpg",
            "y/y4.jpg",
            "y/y5.jpg"
        ]
    }
];

const compliments = ["Красивая", "Умная", "Нежная", "Стильная", "Любимая", "Искренняя", "Веселая"];

let floatingWordsInterval = null;

// Simple image cache + preloader to avoid jank when switching large images
const imageCache = {}; // src -> { img: HTMLImageElement, promise: Promise }
function preloadImage(src) {
    if (!src) return Promise.reject(new Error('no-src'));
    if (imageCache[src]) return imageCache[src].promise;

    const img = new Image();
    const p = new Promise((resolve, reject) => {
        img.onload = async () => {
            // Try to decode to ensure it's ready for painting
            if (img.decode) {
                try { await img.decode(); } catch (e) { /* decode may fail but still continue */ }
            }
            resolve(img);
        };
        img.onerror = () => reject(new Error('image-load-failed:' + src));
    });
    imageCache[src] = { img, promise: p };
    // start loading
    img.src = src;
    return p;
}

// crossfade duration in ms (used by JS to time fallbacks)
const CROSSFADE_DURATION = 900;

// Preload management
let imagesPreloaded = false;
let preloadPromise = null;

// Collect unique image srcs and preload them all
function preloadAllImages() {
    const srcSet = new Set();
    timelineData.forEach(item => {
        if (item.photos && item.photos.length) item.photos.forEach(s => { if (s) srcSet.add(s); });
    });
    const srcs = Array.from(srcSet);
    if (!srcs.length) return Promise.resolve();
    const loaders = srcs.map(s => preloadImage(s).catch(() => null));
    return Promise.all(loaders).then(() => {});
}

/* === ОСНОВНАЯ ЛОГИКА === */
let currentStage = 0;
let currentPhotoIndex = 0;
let musicPlaying = false;
let photoZoomed = false;
let autoPhotoInterval = null;
let autoPhotoDelay = 4500; // ms between automatic photo flips
let autoPhotoPaused = false;
let autoPhotoResumeTimeout = null;

// DOM Элементы
const heroSection = document.getElementById('hero-section');
const journeySection = document.getElementById('journey-section');
const finalSection = document.getElementById('final-section');
const warpOverlay = document.getElementById('warp-overlay');
const memoryCard = document.getElementById('memory-card');
const counterDisplay = document.getElementById('counter-display');
const musicBtn = document.getElementById('music-btn');
const bgMusic = document.getElementById('bg-music');

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    startCounter();
    initParticles();
    animateParticles();

    // start preloading all timeline images in background immediately
    preloadPromise = preloadAllImages().then(() => { imagesPreloaded = true; }).catch(() => { imagesPreloaded = true; });

    // preload final background images for a smooth final screen
    preloadFinalImages();

    // Попытка тихого автопроигрывания музыки при загрузке
    if (bgMusic) {
        bgMusic.volume = 0.12;
        bgMusic.loop = true;
        // Сначала пробуем воспроизвести с звуком — если блокируется, пробуем воспроизведение в режиме muted
        bgMusic.muted = false;
        bgMusic.play().then(() => {
            musicPlaying = true;
            if (musicBtn) musicBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }).catch(async () => {
            // Не удалось воспроизвести с звуком — пробуем muted autoplay
            bgMusic.muted = true;
            try {
                await bgMusic.play();
                // Muted autoplay удался — покажем подсказку для пользователя, чтобы включить звук
                musicPlaying = false;
                if (musicBtn) musicBtn.innerHTML = '<i class="fas fa-volume-off"></i>';
                showUnmutePrompt();
            } catch (e) {
                // Полностью заблокировано — показываем подсказку
                musicPlaying = false;
                if (musicBtn) musicBtn.innerHTML = '<i class="fas fa-music"></i>';
                showUnmutePrompt();
            }
        });
    }
});

function showUnmutePrompt() {
    if (document.getElementById('unmute-prompt')) return;
    const btn = document.createElement('button');
    btn.id = 'unmute-prompt';
    btn.textContent = 'Включить звук';
    btn.style.position = 'fixed';
    btn.style.right = '18px';
    btn.style.bottom = '18px';
    btn.style.zIndex = '10001';
    btn.style.padding = '10px 14px';
    btn.style.borderRadius = '20px';
    btn.style.border = 'none';
    btn.style.background = 'rgba(212,175,55,0.95)';
    btn.style.color = '#000';
    btn.style.cursor = 'pointer';
    btn.style.fontWeight = '600';
    btn.addEventListener('click', unmuteAndPlay);
    document.body.appendChild(btn);
    // also listen for any user gesture to remove prompt
    const gestureHandler = () => { unmuteAndPlay(); window.removeEventListener('click', gestureHandler); window.removeEventListener('keydown', gestureHandler); };
    window.addEventListener('click', gestureHandler);
    window.addEventListener('keydown', gestureHandler);
}

// Final background images (fin folder)
const finalBgImages = [
    'fin/fin1.jpg',
    'fin/fin2.jpg',
    'fin/fin3.jpg',
    'fin/fin4.jpg',
    'fin/fin5.jpg'
];

function preloadFinalImages() {
    finalBgImages.forEach(src => { preloadImage(src).catch(() => null); });
}

// Final background slideshow (JS-controlled to guarantee timing)
let finalSlides = null;
let finalSlideIndex = 0;
let finalSlideInterval = null;
const FINAL_MIN_DISPLAY = 4000; // ms fully-visible per slide (minimum)
const FINAL_FADE_MS = 1200; // should match CSS transition duration

function startFinalSlideshow() {
    const wrapper = document.querySelector('.final-bg-slideshow');
    if (!wrapper) return;
    finalSlides = Array.from(wrapper.querySelectorAll('.slide'));
    if (!finalSlides.length) return;
    // ensure initial state
    finalSlides.forEach((s, i) => { s.classList.remove('visible'); s.style.opacity = '0'; });
    finalSlideIndex = 0;
    finalSlides[finalSlideIndex].classList.add('visible');

    // cycle slides at fixed interval (fully-visible time + fade time)
    if (finalSlideInterval) clearInterval(finalSlideInterval);
    finalSlideInterval = setInterval(() => {
        const prev = finalSlides[finalSlideIndex];
        prev.classList.remove('visible');
        finalSlideIndex = (finalSlideIndex + 1) % finalSlides.length;
        const next = finalSlides[finalSlideIndex];
        next.classList.add('visible');
    }, FINAL_MIN_DISPLAY + FINAL_FADE_MS);
}

function stopFinalSlideshow() {
    if (finalSlideInterval) { clearInterval(finalSlideInterval); finalSlideInterval = null; }
    if (finalSlides && finalSlides.length) finalSlides.forEach(s => s.classList.remove('visible'));
    finalSlides = null;
    finalSlideIndex = 0;
}

async function unmuteAndPlay() {
    const prompt = document.getElementById('unmute-prompt');
    if (!bgMusic) return;
    try {
        bgMusic.muted = false;
        bgMusic.volume = 0.12;
        await bgMusic.play();
        musicPlaying = true;
        if (musicBtn) musicBtn.innerHTML = '<i class="fas fa-pause"></i>';
        if (prompt) prompt.remove();
    } catch (e) {
        // если снова не получилось — просто remove prompt after short timeout
        setTimeout(() => { if (prompt) prompt.remove(); }, 3000);
    }
}

document.getElementById('start-btn').addEventListener('click', startJourney);
const nextStepBtn = document.getElementById('next-step-btn');
const prevStepBtn = document.getElementById('prev-step-btn');
if (nextStepBtn) nextStepBtn.addEventListener('click', () => { pauseAutoPhotosTemporary(); nextStep(); });
if (prevStepBtn) prevStepBtn.addEventListener('click', () => { pauseAutoPhotosTemporary(); prevStep(); });
const navPrevBtn = document.querySelector('.nav-btn.prev');
const navNextBtn = document.querySelector('.nav-btn.next');
if (navPrevBtn) navPrevBtn.addEventListener('click', () => { pauseAutoPhotosTemporary(); changePhoto(-1); });
if (navNextBtn) navNextBtn.addEventListener('click', () => { pauseAutoPhotosTemporary(); changePhoto(1); });

// Музыка
if (musicBtn) {
    musicBtn.addEventListener('click', async () => {
        if (!bgMusic) return;
        if (musicPlaying) {
            bgMusic.pause();
            musicPlaying = false;
            musicBtn.innerHTML = '<i class="fas fa-music"></i>';
        } else {
            try {
                await bgMusic.play();
                musicPlaying = true;
                musicBtn.innerHTML = '<i class="fas fa-pause"></i>';
            } catch (e) {
                alert('Нажмите по странице, чтобы разрешить воспроизведение музыки');
            }
        }
    });
}

// Счетчик времени
function startCounter() {
    if (!counterDisplay) return; // таймер может отсутствовать на главном экране
    function computeAgeParts(birth, now) {
        let years = now.getFullYear() - birth.getFullYear();
        let months = now.getMonth() - birth.getMonth();
        let days = now.getDate() - birth.getDate();

        if (days < 0) {
            const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
            days += prevMonth;
            months -= 1;
        }
        if (months < 0) {
            months += 12;
            years -= 1;
        }
        return { years, months, days };
    }

    function update() {
        const now = new Date();
        const parts = computeAgeParts(birthDate, now);
        const diff = now - birthDate;

        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);

        counterDisplay.innerHTML = `
            <div class="age-ymd">${parts.years}г ${parts.months}м ${parts.days}д</div>
            <div class="age-hms">${hours}ч ${minutes}м ${seconds}с</div>
        `;
    }

    update();
    setInterval(update, 1000);
}

// Генерация таймлайна
function initTimeline() {
    const container = document.getElementById('years-container');
    container.innerHTML = '';
    timelineData.forEach((item, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.classList.add('year-marker');
        // semantic label for screen-readers; visual is a dot
        btn.setAttribute('aria-label', item.title || (item.year || 'stage'));
        btn.dataset.index = i;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            pauseAutoPhotosTemporary();
            triggerWarpEffect(() => loadStage(i));
        });
        container.appendChild(btn);
    });
}

async function startJourney() {
    // ensure timeline markers are ready
    initTimeline();

    // stop final slideshow if user restarts journey
    try { stopFinalSlideshow(); } catch (e) { /* ignore if not defined yet */ }

    // If images not yet preloaded, wait and show a small loading overlay
    if (!imagesPreloaded) {
        showImageLoadingOverlay();
        try { if (preloadPromise) await preloadPromise; } catch (e) { /* ignore */ }
        hideImageLoadingOverlay();
    }

    // Красивый уход со сцены
    heroSection.style.transition = "transform 1s, opacity 1s";
    heroSection.style.transform = "scale(1.1)";
    heroSection.style.opacity = '0';
    
    setTimeout(() => {
        heroSection.classList.remove('active');
        journeySection.classList.add('active');
        triggerWarpEffect(() => {
            loadStage(0);
            startFloatingWords();
        });
    }, 1000);
}

function showImageLoadingOverlay() {
    if (document.getElementById('image-loading-overlay')) return;
    const ov = document.createElement('div');
    ov.id = 'image-loading-overlay';
    ov.innerHTML = '<div class="loader-box"><div class="loader-spinner"></div><div class="loader-text">Загрузка фотографий...</div></div>';
    document.body.appendChild(ov);
}

function hideImageLoadingOverlay() {
    const ov = document.getElementById('image-loading-overlay');
    if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
}

// Мягкий переход (Варп)
function triggerWarpEffect(callback) {
    // stop auto photos while transitioning between stages
    stopAutoPhotos();
    warpOverlay.classList.add('warping');
    
    setTimeout(() => {
        if(callback) callback();
    }, 600); // Смена контента в середине размытия

    setTimeout(() => {
        warpOverlay.classList.remove('warping');
    }, 1500);
}

function loadStage(index) {
    currentStage = index;
    currentPhotoIndex = 0;
    const data = timelineData[index];

    // Скрываем карточку (она уезжает вниз)
    memoryCard.style.opacity = '0';
    memoryCard.style.transform = 'translateY(30px)';

    setTimeout(() => {
        // Обновляем данные
        // скрываем/убираем текст года на карточке — показываем только контент
        const frameYearEl = document.getElementById('frame-year');
        if (frameYearEl) frameYearEl.textContent = '';
        document.getElementById('frame-title').textContent = data.title;
        document.getElementById('frame-text').textContent = data.description;
        updatePhoto();

        // Обновляем таймлайн
        document.querySelectorAll('.year-marker').forEach((m, i) => {
            m.classList.remove('active');
            if(i === index) m.classList.add('active');
        });

        const prevBtn = document.getElementById('prev-step-btn');
        index === 0 ? prevBtn.classList.add('hidden') : prevBtn.classList.remove('hidden');

        // Показываем карточку плавно
        memoryCard.classList.add('show');
        memoryCard.style.opacity = '1';
        memoryCard.style.transform = 'translateY(0)';
        // запускаем автоперелистывание фото для этой стадии
        startAutoPhotos();
    }, 500);
}

function updatePhoto() {
    const topImg = document.getElementById('main-photo');
    const bottomImg = document.getElementById('secondary-photo');
    const container = document.querySelector('.photo-container');
    const src = (timelineData[currentStage] && timelineData[currentStage].photos && timelineData[currentStage].photos[currentPhotoIndex]) || '';

    if (container) { container.classList.remove('zoomed'); photoZoomed = false; }

    // Load into the hidden layer, then crossfade by toggling opacities (no DOM creation/removal)
    preloadImage(src).then((preImg) => {
        // prepare bottom layer with new image
        bottomImg.src = preImg.src;
        // ensure stacking so bottom can be brought above for crossfade
        bottomImg.style.zIndex = '3';
        topImg.style.zIndex = '2';

        // force a layout then switch opacities to crossfade
        requestAnimationFrame(() => {
            bottomImg.style.opacity = '1';
            topImg.style.opacity = '0';
        });

        // after transition, copy new src to top image and reset layers
        const finish = () => {
            topImg.src = preImg.src;
            topImg.style.opacity = '1';
            bottomImg.style.opacity = '0';
            // reset stacking to keep top as click target
            topImg.style.zIndex = '3';
            bottomImg.style.zIndex = '2';
        };

        // safe finish via transitionend or timeout
        let done = false;
        function onEnd() { if (done) return; done = true; finish(); }
        bottomImg.addEventListener('transitionend', onEnd, { once: true });
        setTimeout(onEnd, CROSSFADE_DURATION + 80);

        // click handler stays on top image
        topImg.onclick = () => openPhotoModal(currentStage, currentPhotoIndex);
    }).catch(() => {
        // fallback simple swap
        topImg.style.transition = `opacity ${CROSSFADE_DURATION}ms ease`;
        topImg.style.opacity = '0';
        setTimeout(() => {
            topImg.src = src;
            topImg.onclick = () => openPhotoModal(currentStage, currentPhotoIndex);
            requestAnimationFrame(() => { topImg.style.opacity = '1'; });
        }, 120);
    });

    // ensure overlay exists (kept as a DOM child for the container)
    if (container) {
        let overlay = container.querySelector('.photo-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'photo-overlay';
            overlay.textContent = 'Увеличить';
            container.appendChild(overlay);
        }
    }
}

// AUTO-PHOTO CONTROLS
function startAutoPhotos() {
    stopAutoPhotos();
    if (autoPhotoPaused) return;
    autoPhotoInterval = setInterval(() => {
        // advance to next photo
        const photos = timelineData[currentStage] && timelineData[currentStage].photos;
        if (!photos || photos.length <= 1) return;
        currentPhotoIndex = (currentPhotoIndex + 1) % photos.length;
        updatePhoto();
    }, autoPhotoDelay);
}
function stopAutoPhotos() {
    if (autoPhotoInterval) { clearInterval(autoPhotoInterval); autoPhotoInterval = null; }
}
function pauseAutoPhotosTemporary(ms = 7000) {
    // stop automatic flipping temporarily after manual interaction
    stopAutoPhotos();
    autoPhotoPaused = true;
    if (autoPhotoResumeTimeout) clearTimeout(autoPhotoResumeTimeout);
    autoPhotoResumeTimeout = setTimeout(() => {
        autoPhotoPaused = false;
        startAutoPhotos();
    }, ms);
}

// Open fullscreen photo modal (enlarges image itself)
function openPhotoModal(src) {
    // legacy signature support
    if (arguments.length === 1 && typeof src === 'string') {
        // find matching indices
        let foundStage = currentStage;
        let foundIndex = currentPhotoIndex;
        for (let s = 0; s < timelineData.length; s++) {
            const idx = timelineData[s].photos.indexOf(src);
            if (idx !== -1) { foundStage = s; foundIndex = idx; break; }
        }
        return openPhotoModal(foundStage, foundIndex);
    }
    const stageIdx = arguments[0];
    const photoIdx = arguments[1] || 0;
    if (document.querySelector('.photo-modal')) return;
    // pause auto photos while modal is open
    stopAutoPhotos();
    autoPhotoPaused = true;

    const modal = document.createElement('div');
    modal.className = 'photo-modal';

    const mimg = document.createElement('img');
    const initialSrc = (timelineData[stageIdx] && timelineData[stageIdx].photos && timelineData[stageIdx].photos[photoIdx]) || '';
    // Use preloaded image if available to avoid decode/paint jank
    if (initialSrc) {
        preloadImage(initialSrc).then((pre) => { mimg.src = pre.src; }).catch(() => { mimg.src = initialSrc; });
    } else {
        mimg.src = '';
    }
    modal.appendChild(mimg);

    // nav buttons
    const prev = document.createElement('button');
    prev.className = 'modal-nav modal-prev';
    prev.innerHTML = '<i class="fas fa-chevron-left"></i>';
    const next = document.createElement('button');
    next.className = 'modal-nav modal-next';
    next.innerHTML = '<i class="fas fa-chevron-right"></i>';
    modal.appendChild(prev);
    modal.appendChild(next);

    document.body.appendChild(modal);

    // allow CSS transition
    requestAnimationFrame(() => modal.classList.add('visible'));

    let modalStage = stageIdx;
    let modalIndex = photoIdx;

    function updateModalImage() {
        const src = (timelineData[modalStage] && timelineData[modalStage].photos && timelineData[modalStage].photos[modalIndex]) || '';
        // create a temporary overlay image in the modal for crossfade
        const overlay = document.createElement('img');
        overlay.className = 'photo-fade';
        overlay.style.position = 'absolute';
        overlay.style.left = '50%'; overlay.style.top = '50%';
        overlay.style.transform = 'translate(-50%, -50%)';
        overlay.style.maxWidth = '92%'; overlay.style.maxHeight = '92%';
        overlay.style.objectFit = 'contain';
        overlay.style.zIndex = 3;
        overlay.style.opacity = '0';

        preloadImage(src).then((pre) => {
            overlay.src = pre.src;
            document.body.appendChild(overlay);
            requestAnimationFrame(() => { overlay.style.opacity = '1'; mimg.style.opacity = '0'; });
            const finish = () => {
                mimg.src = pre.src;
                mimg.style.opacity = '1';
                if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
            };
            overlay.addEventListener('transitionend', finish);
            setTimeout(finish, CROSSFADE_DURATION + 50);
        }).catch(() => {
            // fallback
            mimg.style.transition = `opacity ${CROSSFADE_DURATION}ms ease`;
            mimg.style.opacity = '0';
            setTimeout(() => { mimg.src = src; mimg.style.opacity = '1'; }, 120);
        });
    }

    prev.addEventListener('click', (e) => {
        e.stopPropagation();
        const photos = timelineData[modalStage].photos;
        modalIndex = (modalIndex - 1 + photos.length) % photos.length;
        // sync global index
        currentStage = modalStage;
        currentPhotoIndex = modalIndex;
        updateModalImage();
        updatePhoto();
    });
    next.addEventListener('click', (e) => {
        e.stopPropagation();
        const photos = timelineData[modalStage].photos;
        modalIndex = (modalIndex + 1) % photos.length;
        currentStage = modalStage;
        currentPhotoIndex = modalIndex;
        updateModalImage();
        updatePhoto();
    });

    // keyboard nav and escape
    function keyHandler(e) {
        if (e.key === 'Escape') closeModal();
        if (e.key === 'ArrowLeft') prev.click();
        if (e.key === 'ArrowRight') next.click();
    }
    window.addEventListener('keydown', keyHandler);

    // click overlay closes
    modal.addEventListener('click', () => closeModal());
    function closeModal() {
        modal.classList.remove('visible');
        window.removeEventListener('keydown', keyHandler);
        setTimeout(() => { if (modal && modal.parentNode) modal.parentNode.removeChild(modal); }, 400);
        // resume auto photos shortly after closing
        autoPhotoPaused = false;
        startAutoPhotos();
    }
}

function changePhoto(dir) {
    const photos = timelineData[currentStage].photos;
    currentPhotoIndex = (currentPhotoIndex + dir + photos.length) % photos.length;
    updatePhoto();
}

function nextStep() {
    if (currentStage < timelineData.length - 1) {
        triggerWarpEffect(() => loadStage(currentStage + 1));
    } else {
        finishJourney();
    }
}

function prevStep() {
    if (currentStage > 0) {
        const nextIndex = Math.max(0, currentStage - 1);
        triggerWarpEffect(() => loadStage(nextIndex));
    }
}

function finishJourney() {
    journeySection.style.opacity = '0';
    setTimeout(() => {
        journeySection.classList.remove('active');
        finalSection.classList.add('active');
        // Останавливаем интервал плавающих слов, если был
        if (floatingWordsInterval) {
            clearInterval(floatingWordsInterval);
            floatingWordsInterval = null;
        }
        // stop auto photo flipping
        stopAutoPhotos();
        startConfetti();
        // start final background slideshow
        startFinalSlideshow();
    }, 1000);
}

/* === ВСПЛЫВАЮЩИЕ СЛОВА === */
function startFloatingWords() {
    if (floatingWordsInterval) return; // уже запущен

    floatingWordsInterval = setInterval(() => {
        if (!journeySection.classList.contains('active')) return;

        const word = document.createElement('div');
        word.classList.add('floating-word');
        word.textContent = compliments[Math.floor(Math.random() * compliments.length)];

        // Случайная позиция
        const x = Math.random() * 80 + 10; // 10% - 90% width
        const y = Math.random() * 80 + 10;

        word.style.left = x + '%';
        word.style.top = y + '%';

        document.getElementById('floating-words-container').appendChild(word);

        setTimeout(() => word.remove(), 4000);
    }, 2500);
}

/* === ИНТЕРАКТИВ (КУРСОР И 3D) === */
const cursor = document.getElementById('cursor');
const cursorBlur = document.getElementById('cursor-blur');

document.addEventListener('mousemove', (e) => {
    // Движение курсора
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
    cursorBlur.style.left = e.clientX + 'px';
    cursorBlur.style.top = e.clientY + 'px';

    // Эффект 3D для карточки
    if (memoryCard.classList.contains('show')) {
        const x = (window.innerWidth / 2 - e.clientX) / 120; // ещё менее выраженный эффект
        const y = (window.innerHeight / 2 - e.clientY) / 120;
        memoryCard.style.transform = `translateY(0) rotateY(${x}deg) rotateX(${y}deg)`;
    }

    // Взаимодействие с частицами
    if(particlesArray) {
        particlesArray.forEach(p => {
            const dx = e.clientX - p.x;
            const dy = e.clientY - p.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if(dist < 100) {
                p.x -= dx / 10;
                p.y -= dy / 10;
            }
        });
    }
});

/* === ЧАСТИЦЫ === */
const canvas = document.getElementById('particleCanvas');
let ctx = canvas ? canvas.getContext('2d') : null;
if (canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx = canvas.getContext('2d');
}
let particlesArray = [];

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = Math.random() * 1 - 0.5;
        this.speedY = Math.random() * 1 - 0.5;
        this.opacity = Math.random() * 0.5 + 0.2;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if(this.x > canvas.width) this.x = 0;
        if(this.x < 0) this.x = canvas.width;
        if(this.y > canvas.height) this.y = 0;
        if(this.y < 0) this.y = canvas.height;
    }
    draw() {
        ctx.fillStyle = `rgba(212, 175, 55, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function initParticles() {
    particlesArray = [];
    // fewer particles to reduce CPU load on lower-end devices
    for(let i=0; i<45; i++) particlesArray.push(new Particle());
}
function animateParticles() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particlesArray.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animateParticles);
}

// Конфетти (простое)
function startConfetti() {
    const cCanvas = document.getElementById('confettiCanvas');
    if (!cCanvas) return;
    const cCtx = cCanvas.getContext('2d');
    cCanvas.width = window.innerWidth;
    cCanvas.height = window.innerHeight;
    
    let confetti = [];
    const colors = ['#d4af37', '#f3e5ab', '#ffffff'];

    for(let i=0; i<100; i++) {
        confetti.push({
            x: Math.random() * cCanvas.width,
            y: Math.random() * cCanvas.height - cCanvas.height,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 5 + 3,
            speed: Math.random() * 3 + 2,
            wobble: Math.random() * 10
        });
    }

    function animate() {
        cCtx.clearRect(0, 0, cCanvas.width, cCanvas.height);
        confetti.forEach(c => {
            c.y += c.speed;
            c.x += Math.sin(c.wobble);
            c.wobble += 0.05;
            cCtx.fillStyle = c.color;
            cCtx.fillRect(c.x, c.y, c.size, c.size);
        });
        requestAnimationFrame(animate);
    }
    animate();
}

// Обработка ресайза — корректируем размеры canvas и пересоздаём частицы
window.addEventListener('resize', () => {
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        ctx = canvas.getContext('2d');
    }
    const cCanvas = document.getElementById('confettiCanvas');
    if (cCanvas) {
        cCanvas.width = window.innerWidth;
        cCanvas.height = window.innerHeight;
    }
    initParticles();

});
