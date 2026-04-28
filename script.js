// Горизонтальная прокрутка: зажать ЛКМ и тянуть влево/вправо (колёсико не используется)
const scrollContainer = document.querySelector('.horizontal-scroll');
const verticalLayoutQuery = window.matchMedia('(max-width: 1024px)');

let mainScrollAnimToken = 0;

function isVerticalLayout() {
    return verticalLayoutQuery.matches;
}

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Плавное перелистывание к заданному scrollLeft (не полагаемся на behavior: smooth — он с snap даёт рывки) */
function smoothScrollHorizontalTo(targetLeft, durationMs = 680) {
    if (!scrollContainer) return;
    if (isVerticalLayout()) return;
    const maxSl = Math.max(0, scrollContainer.scrollWidth - scrollContainer.clientWidth);
    const to = Math.min(maxSl, Math.max(0, targetLeft));
    const from = scrollContainer.scrollLeft;
    const delta = to - from;
    if (Math.abs(delta) < 0.5) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        scrollContainer.scrollLeft = to;
        return;
    }

    const token = ++mainScrollAnimToken;
    scrollContainer.classList.add('is-page-animating');
    const t0 = performance.now();

    function frame(now) {
        if (token !== mainScrollAnimToken) {
            scrollContainer.classList.remove('is-page-animating');
            return;
        }
        const elapsed = now - t0;
        const t = Math.min(1, elapsed / durationMs);
        scrollContainer.scrollLeft = from + delta * easeInOutCubic(t);
        if (t < 1) {
            requestAnimationFrame(frame);
        } else {
            scrollContainer.scrollLeft = to;
            scrollContainer.classList.remove('is-page-animating');
        }
    }
    requestAnimationFrame(frame);
}

function cancelMainScrollAnimation() {
    mainScrollAnimToken += 1;
    scrollContainer?.classList.remove('is-page-animating');
}

function scrollToSection(sectionId) {
    const targetSection = document.getElementById(sectionId);
    if (!targetSection) return;
    if (isVerticalLayout()) {
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
    }
    if (!scrollContainer) return;
    smoothScrollHorizontalTo(targetSection.offsetLeft);
}

verticalLayoutQuery.addEventListener('change', () => {
    if (!scrollContainer) return;
    cancelMainScrollAnimation();
    scrollContainer.classList.remove('is-dragging');
});

function dragScrollIgnoredTarget(target) {
    if (!(target instanceof Element)) return true;
    return !!target.closest(
        [
            'a',
            'button',
            'input',
            'select',
            'textarea',
            'label',
            '.navbar',
            '.chat-assistant',
            '.chat-panel',
            '.hero-side-cta',
            '#bookingModal',
            '#bookingDatetimeModal',
            '.booking-datetime-modal',
            '.timeline-track',
            '.timeline-controls',
        ].join(', ')
    );
}

if (scrollContainer) {
    let isWheelPaging = false;

    scrollContainer.addEventListener('wheel', (e) => {
        if (isVerticalLayout()) return;
        if (e.ctrlKey) return;
        if (dragScrollIgnoredTarget(e.target)) return;

        const dominantDelta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
        if (dominantDelta === 0 || isWheelPaging) return;

        e.preventDefault();
        isWheelPaging = true;
        cancelMainScrollAnimation();

        // Стандартное поведение: колесо вниз -> вправо, вверх -> влево.
        const direction = dominantDelta > 0 ? 1 : -1;
        const pageWidth = scrollContainer.clientWidth;
        const targetLeft = scrollContainer.scrollLeft + direction * pageWidth;
        smoothScrollHorizontalTo(targetLeft);
        window.setTimeout(() => {
            isWheelPaging = false;
        }, 740);
    }, { passive: false });
}

// Прогресс-бар
const progressBar = document.querySelector('.progress-bar');

if (scrollContainer && progressBar) {
    scrollContainer.addEventListener('scroll', () => {
        if (isVerticalLayout()) return;
        const scrollWidth = scrollContainer.scrollWidth - scrollContainer.clientWidth;
        const progress = scrollWidth > 0 ? (scrollContainer.scrollLeft / scrollWidth) * 100 : 0;
        progressBar.style.width = progress + '%';
    });
}

// Навигация по секциям через меню
const menuItems = document.querySelectorAll('.menu-item');
const sections = document.querySelectorAll('.section');

menuItems.forEach(item => {
    item.addEventListener('click', () => {
        const sectionId = item.dataset.section;
        if (!sectionId) return;
        scrollToSection(sectionId);
    });
});

// Таймлайн навигация
const timelinePrev = document.querySelector('.timeline-prev');
const timelineNext = document.querySelector('.timeline-next');
const timelineTrack = document.querySelector('.timeline-track');

if (timelineNext) {
    timelineNext.addEventListener('click', () => {
        timelineTrack.scrollBy({ left: 400, behavior: 'smooth' });
    });
}

if (timelinePrev) {
    timelinePrev.addEventListener('click', () => {
        timelineTrack.scrollBy({ left: -400, behavior: 'smooth' });
    });
}

/** На второй странице («Опыт») колесо мыши листает годы по горизонтали, не сдвигая весь сайт */
const experienceSection = document.getElementById('experience');
if (experienceSection && timelineTrack) {
    experienceSection.addEventListener(
        'wheel',
        (e) => {
            const maxSl = timelineTrack.scrollWidth - timelineTrack.clientWidth;
            if (maxSl <= 0) return;

            const linePx = 32;
            const scale =
                e.deltaMode === 1
                    ? linePx
                    : e.deltaMode === 2
                      ? timelineTrack.clientWidth
                      : 1;
            const dy = (e.deltaY + e.deltaX) * scale;
            if (dy === 0) return;
            const from = timelineTrack.scrollLeft;
            const next = Math.min(maxSl, Math.max(0, from + dy));

            // Блокируем прокрутку страницы только если реально двигаем таймлайн.
            if (Math.abs(next - from) > 0.5) {
                e.preventDefault();
                timelineTrack.scrollLeft = next;
            }
        },
        { passive: false }
    );
}

// Модальное окно
const modal = document.getElementById('bookingModal');
const craftCards = document.querySelectorAll('.craft-card');
const craftBtns = document.querySelectorAll('.craft-btn');
const closeBtn = document.querySelector('.close');
const portfolioItems = document.querySelectorAll('.portfolio-feature, .portfolio-tile');

const portfolioModal = document.getElementById('portfolioModal');
const portfolioModalBackdrop = document.getElementById('portfolioModalBackdrop');
const portfolioModalClose = document.getElementById('portfolioModalClose');
const portfolioModalImage = document.getElementById('portfolioModalImage');
const portfolioModalTitle = document.getElementById('portfolioModalTitle');

const serviceModal = document.getElementById('serviceModal');
const serviceModalBackdrop = document.getElementById('serviceModalBackdrop');
const serviceModalClose = document.getElementById('serviceModalClose');
const serviceModalImage = document.getElementById('serviceModalImage');
const serviceModalTitle = document.getElementById('serviceModalTitle');
const serviceModalDescription = document.getElementById('serviceModalDescription');
const serviceModalPoints = document.getElementById('serviceModalPoints');
const serviceModalBookBtn = document.getElementById('serviceModalBookBtn');
let selectedServiceForBooking = '';

const SERVICE_DETAILS = {
    'Стрижка': {
        title: 'Стрижка',
        description:
            'Индивидуальная стрижка с учетом структуры волос, формы лица и вашего ежедневного стиля укладки.',
        points: [
            'Консультация и подбор формы под ваши черты лица',
            'Точное выполнение техники и финальная текстурная доработка',
            'Рекомендации по домашней укладке и сохранению формы',
        ],
    },
    'Окрашивание': {
        title: 'Окрашивание',
        description:
            'Премиальное окрашивание с подбором оттенка и техники для естественного и стойкого результата.',
        points: [
            'Диагностика волос перед процедурой и подбор формулы',
            'Современные техники: от тонирования до сложного окрашивания',
            'Бережный протокол и рекомендации по сохранению цвета',
        ],
    },
    'Укладка': {
        title: 'Укладка',
        description:
            'Укладка для повседневного образа или события: объем, текстура и фиксация под ваш запрос.',
        points: [
            'Подбор формы укладки под длину и тип волос',
            'Работа с объемом у корней и стойкостью в течение дня',
            'Советы по быстрому повторению образа дома',
        ],
    },
    'Восстановление волос': {
        title: 'Восстановление волос',
        description:
            'Экспресс- и интенсивный уход для восстановления мягкости, плотности и блеска волос.',
        points: [
            'Диагностика состояния и подбор уходового протокола',
            'Профессиональные средства для питания и защиты полотна',
            'Рекомендации по поддержанию результата между визитами',
        ],
    },
};

// Кнопка "Записаться" в шапке ведёт на раздел "Связь"
const navBookBtn = document.querySelector('.navbar .book-btn');
if (navBookBtn) {
    navBookBtn.addEventListener('click', (e) => {
        e.preventDefault();
        scrollToSection('connect');
    });
}

const heroQuickBookBtn = document.getElementById('heroQuickBookBtn');
if (heroQuickBookBtn) {
    heroQuickBookBtn.addEventListener('click', () => {
        scrollToSection('connect');
    });
}

const chatToggleBtn = document.getElementById('chatToggleBtn');
const chatPanel = document.getElementById('chatPanel');
const chatGreeting = document.getElementById('chatGreeting');
const chatQuickButtons = document.querySelectorAll('.chat-quick-btn');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatMessages = document.getElementById('chatMessages');
const phoneInput = document.getElementById('phone');
const commentInput = document.getElementById('comment');

function autoResizeCommentField() {
    if (!commentInput) return;
    commentInput.style.height = 'auto';
    commentInput.style.height = `${commentInput.scrollHeight}px`;
}

function formatRuPhone(value) {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';

    const normalized = digits.startsWith('8') ? `7${digits.slice(1)}` : digits;
    const hasCountryCode = normalized.startsWith('7');
    const core = hasCountryCode ? normalized.slice(1, 11) : normalized.slice(0, 10);
    if (!core) return '+7';

    let result = '+7';
    if (core.length > 0) result += ` (${core.slice(0, 3)}`;
    if (core.length >= 3) result += ')';
    if (core.length > 3) result += ` ${core.slice(3, 6)}`;
    if (core.length > 6) result += `-${core.slice(6, 8)}`;
    if (core.length > 8) result += `-${core.slice(8, 10)}`;

    return result;
}

if (phoneInput) {
    phoneInput.addEventListener('input', () => {
        phoneInput.value = formatRuPhone(phoneInput.value);
    });
}

if (commentInput) {
    autoResizeCommentField();
    commentInput.addEventListener('input', autoResizeCommentField);
}

function appendChatMessage(text, role = 'bot') {
    if (!chatMessages) return;
    const message = document.createElement('div');
    message.className = `chat-message ${role}`;
    message.textContent = text;
    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/** Единая база ответов чата — совпадает с блоком «Связь» на сайте */
const SALON_CHAT_KB = {
    addressShort: 'Москва, пр. Вернадского, 10',
    phone: '+7 (495) 123-45-67',
    email: 'info@beautystyle.ru',
    hoursLine: 'ежедневно с 9:00 до 21:00',
    pricesSummary:
        'Ориентиры по ценам: стрижка от 2500 ₽, окрашивание от 4000 ₽, укладка от 1500 ₽, восстановление волос от 900 ₽. Точную стоимость мастер озвучит после консультации.',
};

function normalizeChatText(raw) {
    return raw
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/ё/g, 'е');
}

function buildAssistantReply(rawText) {
    const text = normalizeChatText(rawText);
    if (!text) {
        return 'Напишите вопрос — я подскажу по салону: адрес, часы, цены, услуги или запись.';
    }

    const wantsThanks = /спасибо|благодар|thanks/.test(text);
    const wantsBye = /пока|до свидан|увидимся|goodbye|bye\b/.test(text);
    const wantsGreeting =
        /^(привет|здравствуйте|здравствуй|добрый день|добрый вечер|доброе утро|hi|hello)\b/.test(text) ||
        /^(привет|здравствуйте|здравствуй|добрый день|добрый вечер|доброе утро|hi|hello)[!.]*$/.test(text);

    const wantsAddress =
        text.includes('адрес') ||
        text.includes('вернадск') ||
        (text.includes('проспект') && (text.includes('вернад') || text.includes('где') || text.includes('как'))) ||
        text.includes('где вы') ||
        text.includes('где нах') ||
        text.includes('где салон') ||
        text.includes('куда ехать') ||
        text.includes('как добраться') ||
        text.includes('как доехать') ||
        text.includes('как к вам') ||
        text.includes('локац') ||
        text.includes('навига') ||
        text.includes('на карте') ||
        text.includes('маршрут') ||
        (text.includes('метро') && (text.includes('рядом') || text.includes('ближ') || text.includes('какой') || text.includes('есть')));

    const wantsPhone =
        text.includes('телефон') ||
        text.includes('позвон') ||
        text.includes('номер тел') ||
        text.includes('набрать') ||
        (text.includes('связ') && (text.includes('как') || text.includes('номер'))) ||
        text.includes('whatsapp') ||
        text.includes('ватсап') ||
        text.includes('телеграм') ||
        text.includes('telegram');

    const wantsEmail = text.includes('email') || text.includes('e-mail') || text.includes('почт');

    const wantsHours =
        text.includes('график') ||
        text.includes('режим') ||
        text.includes('рабочие часы') ||
        text.includes('когда работаете') ||
        text.includes('во сколько откры') ||
        text.includes('во сколько закры') ||
        text.includes('работаете ли') ||
        (text.includes('время') && (text.includes('работ') || text.includes('салон') || text.includes('вы '))) ||
        (text.includes('открыты') && !text.includes('окно'));

    const wantsPrice =
        text.includes('цен') ||
        text.includes('стоим') ||
        text.includes('прайс') ||
        text.includes('тариф') ||
        text.includes('сколько стоит') ||
        text.includes('дорого') ||
        text.includes('дешев') ||
        text.includes('оплат');

    const wantsBooking =
        text.includes('запис') ||
        text.includes('брон') ||
        text.includes('запиш') ||
        text.includes('онлайн-зап') ||
        (text.includes('форм') && text.includes('связ'));

    const wantsServices =
        text.includes('услуг') ||
        text.includes('что делаете') ||
        text.includes('чем занимаетесь') ||
        text.includes('спектр') ||
        text.includes('какие процедур');

    const wantsHaircut = text.includes('стриж');
    const wantsColor = text.includes('окраш') || text.includes('покрас') || text.includes('колор');
    const wantsStyling = text.includes('уклад');
    const wantsCare = text.includes('восстанов') || (text.includes('уход') && text.includes('волос'));

    const substantive =
        wantsAddress ||
        wantsPhone ||
        wantsEmail ||
        wantsHours ||
        wantsPrice ||
        wantsBooking ||
        wantsServices ||
        wantsHaircut ||
        wantsColor ||
        wantsStyling ||
        wantsCare;

    if (wantsThanks && !substantive) {
        return 'Пожалуйста! Если появятся ещё вопросы — пишите, с удовольствием помогу.';
    }
    if (wantsBye && !substantive) {
        return 'До встречи! Будем рады видеть вас в BeautyStyle на пр. Вернадского, 10.';
    }

    const parts = [];

    if (wantsGreeting && substantive) {
        parts.push('Здравствуйте! Кратко по вашему запросу:');
    }

    if (wantsAddress) {
        parts.push(
            `Наш актуальный адрес: ${SALON_CHAT_KB.addressShort}. Ориентируйтесь на него в навигаторе или картах — можно искать по названию салона BeautyStyle.`,
        );
    }
    if (wantsPhone) {
        parts.push(`Телефон для записи и вопросов: ${SALON_CHAT_KB.phone}.`);
    }
    if (wantsEmail) {
        parts.push(`Электронная почта: ${SALON_CHAT_KB.email}.`);
    }
    if (wantsHours) {
        parts.push(
            `Мы работаем ${SALON_CHAT_KB.hoursLine}. Онлайн-запись в разделе «Связь» позволяет выбрать дату и время с шагом 15 минут.`,
        );
    }
    if (wantsBooking) {
        parts.push(
            'Чтобы записаться, откройте последнюю вкладку «Связь» на сайте: заполните имя, телефон, услугу и удобные дату и время. Заявку обработает администратор.',
        );
    }
    if (wantsPrice && !wantsHaircut && !wantsColor && !wantsStyling && !wantsCare) {
        parts.push(SALON_CHAT_KB.pricesSummary);
    }
    if (wantsServices && !wantsHaircut && !wantsColor && !wantsStyling && !wantsCare) {
        parts.push(
            'В BeautyStyle: стрижки и укладки, окрашивание и тонирование, восстановление и уход за волосами. Могу подробнее ответить по любой из услуг — напишите название.',
        );
    }
    if (wantsHaircut) {
        parts.push(
            'Стрижка: подбираем форму под овал лица и структуру волос, согласуем длину и уход дома. Стоимость от 2500 ₽, итог зависит от сложности и мастера.',
        );
    }
    if (wantsColor) {
        parts.push(
            'Окрашивание: работаем с качественными красителями, подбираем тон и технику (сложное окрашивание обсуждается на консультации). От 4000 ₽.',
        );
    }
    if (wantsStyling) {
        parts.push(
            'Укладка: от повседневного объёма до образа к мероприятию, с учётом типа волос. От 1500 ₽.',
        );
    }
    if (wantsCare) {
        parts.push(
            'Восстановление и уход: экспресс-процедуры и рекомендации по домашнему уходу. От 900 ₽.',
        );
    }

    if (wantsThanks && substantive) {
        parts.push('Обращайтесь, если понадобится что-то ещё уточнить.');
    }

    if (parts.length > 0) {
        return parts.join(' ').replace(/\s+/g, ' ').trim();
    }

    if (wantsGreeting) {
        return 'Здравствуйте! Я виртуальный консультант BeautyStyle. Могу рассказать про адрес (пр. Вернадского, 10), часы работы, цены, услуги и как оставить заявку на запись. С чего начнём?';
    }

    return 'Не получилось распознать запрос. Могу подсказать по темам: адрес (Москва, пр. Вернадского, 10), телефон, график 9:00–21:00, цены, услуги и запись через раздел «Связь». Сформулируйте короче или нажмите кнопку ниже.';
}

if (chatToggleBtn && chatPanel) {
    chatToggleBtn.addEventListener('click', () => {
        chatPanel.classList.toggle('open');
        chatGreeting?.classList.remove('show');
        if (chatPanel.classList.contains('open')) {
            chatInput?.focus();
        }
    });
}

if (chatGreeting) {
    setTimeout(() => {
        chatGreeting.classList.add('show');
    }, 800);
}

chatQuickButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
        const question = btn.dataset.question?.trim();
        if (!question) return;
        appendChatMessage(question, 'user');
        const reply = buildAssistantReply(question);
        setTimeout(() => appendChatMessage(reply, 'bot'), 350);
    });
});

if (chatPanel) {
    chatPanel.addEventListener('click', () => {
        chatGreeting?.classList.remove('show');
    });
}

if (chatForm && chatInput) {
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userText = chatInput.value.trim();
        if (!userText) return;

        appendChatMessage(userText, 'user');
        chatInput.value = '';

        const reply = buildAssistantReply(userText);
        setTimeout(() => appendChatMessage(reply, 'bot'), 400);
    });
}

function openModal() {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function openPortfolioModal(imageSrc, imageAlt) {
    if (!portfolioModal || !portfolioModalImage || !portfolioModalTitle) return;
    portfolioModalImage.src = imageSrc;
    portfolioModalImage.alt = imageAlt || 'Фото из портфолио';
    portfolioModalTitle.textContent = imageAlt || 'Фото из портфолио';
    portfolioModal.classList.add('is-open');
    portfolioModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closePortfolioModal() {
    if (!portfolioModal || !portfolioModalImage) return;
    portfolioModal.classList.remove('is-open');
    portfolioModal.setAttribute('aria-hidden', 'true');
    portfolioModalImage.src = '';
    document.body.style.overflow = 'auto';
}

function openServiceModal(serviceName, imageSrc = '', imageAlt = '') {
    const serviceData = SERVICE_DETAILS[serviceName];
    if (!serviceData || !serviceModal || !serviceModalImage) return;
    selectedServiceForBooking = serviceName;
    serviceModalImage.src = imageSrc;
    serviceModalImage.alt = imageAlt || serviceData.title;
    serviceModalTitle.textContent = serviceData.title;
    serviceModalDescription.textContent = serviceData.description;
    serviceModalPoints.textContent = '';
    serviceData.points.forEach((point) => {
        const li = document.createElement('li');
        li.textContent = point;
        serviceModalPoints.appendChild(li);
    });
    serviceModal.classList.add('is-open');
    serviceModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closeServiceModal() {
    if (!serviceModal || !serviceModalImage) return;
    serviceModal.classList.remove('is-open');
    serviceModal.setAttribute('aria-hidden', 'true');
    serviceModalImage.src = '';
    document.body.style.overflow = 'auto';
}

// Окно услуги открывается при клике по карточке (кроме кнопки "Выбрать")
craftCards.forEach((card) => {
    card.addEventListener('click', (e) => {
        if (e.target instanceof Element && e.target.closest('.craft-btn')) return;
        const serviceBtn = card.querySelector('.craft-btn');
        const cardImage = card.querySelector('img');
        const serviceName = serviceBtn?.dataset.service;
        if (!serviceName || !cardImage) return;
        e.preventDefault();
        openServiceModal(serviceName, cardImage.src, cardImage.alt);
    });
});

// Кнопки "Выбрать" оставляем как быстрый переход к записи с подстановкой услуги
craftBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const selectedService = btn.dataset.service;
        const serviceSelect = document.getElementById('service');
        if (serviceSelect && selectedService) {
            serviceSelect.value = selectedService;
            serviceSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        scrollToSection('connect');
    });
});

if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
}

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

portfolioItems.forEach((item) => {
    item.addEventListener('click', () => {
        const img = item.querySelector('img');
        if (!img) return;
        openPortfolioModal(img.src, img.alt);
    });
});

portfolioModalBackdrop?.addEventListener('click', closePortfolioModal);
portfolioModalClose?.addEventListener('click', closePortfolioModal);

serviceModalBackdrop?.addEventListener('click', closeServiceModal);
serviceModalClose?.addEventListener('click', closeServiceModal);
serviceModalBookBtn?.addEventListener('click', () => {
    const serviceSelect = document.getElementById('service');
    if (serviceSelect && selectedServiceForBooking) {
        serviceSelect.value = selectedServiceForBooking;
        serviceSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    closeServiceModal();
    scrollToSection('connect');
});

function showFormNotice(message, isError = false) {
    let notice = document.querySelector('.form-notice');
    if (!notice) {
        notice = document.createElement('div');
        notice.className = 'form-notice';
        document.body.appendChild(notice);
    }

    notice.textContent = message;
    notice.classList.toggle('error', isError);
    notice.classList.add('show');

    clearTimeout(showFormNotice.timeoutId);
    showFormNotice.timeoutId = setTimeout(() => {
        notice.classList.remove('show');
    }, 2600);
}

const EMAILJS_CONFIG = {
    publicKey: 'EOmr_P4b9MseOIdeZ',
    serviceId: 'service_ods2lt9',
    templateId: 'template_3fqq8mn',
    adminEmail: 'ayocarie@gmail.com',
};

function isEmailJsConfigured() {
    return (
        EMAILJS_CONFIG.publicKey !== 'YOUR_EMAILJS_PUBLIC_KEY' &&
        EMAILJS_CONFIG.serviceId !== 'YOUR_EMAILJS_SERVICE_ID' &&
        EMAILJS_CONFIG.templateId !== 'YOUR_EMAILJS_TEMPLATE_ID'
    );
}

if (window.emailjs && isEmailJsConfigured()) {
    window.emailjs.init({
        publicKey: EMAILJS_CONFIG.publicKey,
    });
}

const bookingSuccessModal = document.getElementById('bookingSuccessModal');
const bookingSuccessBackdrop = document.getElementById('bookingSuccessBackdrop');
const bookingSuccessCloseX = document.getElementById('bookingSuccessCloseX');
const bookingSuccessOkBtn = document.getElementById('bookingSuccessOkBtn');

function openBookingSuccessModal() {
    if (!bookingSuccessModal) return;
    bookingSuccessModal.classList.add('is-open');
    bookingSuccessModal.setAttribute('aria-hidden', 'false');
}

function closeBookingSuccessModal() {
    if (!bookingSuccessModal) return;
    bookingSuccessModal.classList.remove('is-open');
    bookingSuccessModal.setAttribute('aria-hidden', 'true');
}

bookingSuccessBackdrop?.addEventListener('click', closeBookingSuccessModal);
bookingSuccessCloseX?.addEventListener('click', closeBookingSuccessModal);
bookingSuccessOkBtn?.addEventListener('click', closeBookingSuccessModal);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && portfolioModal?.classList.contains('is-open')) {
        e.preventDefault();
        closePortfolioModal();
    }
    if (e.key === 'Escape' && serviceModal?.classList.contains('is-open')) {
        e.preventDefault();
        closeServiceModal();
    }
    if (e.key === 'Escape' && bookingSuccessModal?.classList.contains('is-open')) {
        e.preventDefault();
        closeBookingSuccessModal();
    }
});

(function initBookingDatetimeModal() {
    const modal = document.getElementById('bookingDatetimeModal');
    const backdrop = document.getElementById('bdBackdrop');
    const hiddenInput = document.getElementById('datetime');
    const displayInput = document.getElementById('datetimeDisplay');
    const openBtn = document.getElementById('datetimeOpenBtn');
    const bdCloseX = document.getElementById('bdCloseX');
    const bdCancel = document.getElementById('bdCancel');
    const bdApply = document.getElementById('bdApply');
    const bdPrev = document.getElementById('bdPrev');
    const bdNext = document.getElementById('bdNext');
    const bdTitleMonth = document.getElementById('bdTitleMonth');
    const bdGrid = document.getElementById('bdGrid');
    const bdHours = document.getElementById('bdHours');
    const bdMinutes = document.getElementById('bdMinutes');

    if (!modal || !backdrop || !hiddenInput || !displayInput || !openBtn || !bdGrid || !bdHours || !bdMinutes) {
        return;
    }

    const BD_MONTH_NAMES = [
        'январь',
        'февраль',
        'март',
        'апрель',
        'май',
        'июнь',
        'июль',
        'август',
        'сентябрь',
        'октябрь',
        'ноябрь',
        'декабрь',
    ];
    const QUARTERS = [0, 15, 30, 45];
    const BD_OPEN = 9;
    const BD_CLOSE = 21;

    function pad2(n) {
        return String(n).padStart(2, '0');
    }

    function startOfLocalDay(d) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    function addMonthsFromDate(d, n) {
        return new Date(d.getFullYear(), d.getMonth() + n, 1);
    }

    function parseIsoLocal(s) {
        if (!s || typeof s !== 'string') return null;
        const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(s.trim());
        if (!m) return null;
        const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), 0, 0);
        return Number.isNaN(dt.getTime()) ? null : dt;
    }

    function formatIsoForHidden(d) {
        return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    }

    function formatDisplayRu(d) {
        return d.toLocaleString('ru-RU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    function nextAvailableSlot() {
        const now = Date.now();
        const slot = new Date();
        slot.setSeconds(0, 0);
        slot.setMilliseconds(0);
        let nextQ = Math.ceil((slot.getMinutes() + 1) / 15) * 15;
        if (nextQ >= 60) {
            slot.setHours(slot.getHours() + 1, 0, 0, 0);
        } else {
            slot.setMinutes(nextQ, 0, 0);
        }
        while (slot.getTime() <= now) {
            slot.setTime(slot.getTime() + 15 * 60000);
        }
        while (true) {
            const h = slot.getHours();
            const m = slot.getMinutes();
            if (h < BD_OPEN) {
                slot.setHours(BD_OPEN, 0, 0, 0);
                break;
            }
            if (h > BD_CLOSE || (h === BD_CLOSE && m > 0)) {
                slot.setDate(slot.getDate() + 1);
                slot.setHours(BD_OPEN, 0, 0, 0);
                continue;
            }
            break;
        }
        return slot;
    }

    const todayStart = startOfLocalDay(new Date());
    const viewMinYm = todayStart.getFullYear() * 12 + todayStart.getMonth();
    const viewMaxStart = addMonthsFromDate(todayStart, 6);
    const viewMaxYm = viewMaxStart.getFullYear() * 12 + viewMaxStart.getMonth();
    const bookMaxEnd = new Date(viewMaxStart.getFullYear(), viewMaxStart.getMonth() + 1, 0, 23, 59, 59, 999);

    let bdViewYear = todayStart.getFullYear();
    let bdViewMonth0 = todayStart.getMonth();
    let bdDraftDay = startOfLocalDay(todayStart);
    let bdDraftHour = BD_OPEN;
    let bdDraftMin = 0;

    let previouslyFocused = null;

    function viewYm() {
        return bdViewYear * 12 + bdViewMonth0;
    }

    function composeSlot() {
        return new Date(
            bdDraftDay.getFullYear(),
            bdDraftDay.getMonth(),
            bdDraftDay.getDate(),
            bdDraftHour,
            bdDraftMin,
            0,
            0
        );
    }

    function isMinuteSelectable(m) {
        if (bdDraftHour === BD_CLOSE && m !== 0) return false;
        const t = new Date(bdDraftDay.getFullYear(), bdDraftDay.getMonth(), bdDraftDay.getDate(), bdDraftHour, m, 0, 0);
        return t.getTime() > Date.now();
    }

    function pickFirstValidMinuteForHour(h) {
        for (const m of QUARTERS) {
            if (h === BD_CLOSE && m !== 0) continue;
            const t = new Date(bdDraftDay.getFullYear(), bdDraftDay.getMonth(), bdDraftDay.getDate(), h, m, 0, 0);
            if (t.getTime() > Date.now()) return m;
        }
        return null;
    }

    function isHourSelectable(h) {
        if (h < BD_OPEN || h > BD_CLOSE) return false;
        return pickFirstValidMinuteForHour(h) !== null;
    }

    function afterDayChange() {
        let t = composeSlot();
        const now = Date.now();
        if (t.getTime() <= now) {
            const n = nextAvailableSlot();
            if (
                n.getFullYear() === bdDraftDay.getFullYear() &&
                n.getMonth() === bdDraftDay.getMonth() &&
                n.getDate() === bdDraftDay.getDate()
            ) {
                bdDraftHour = n.getHours();
                bdDraftMin = n.getMinutes();
            } else {
                bdDraftDay = startOfLocalDay(n);
                bdViewYear = bdDraftDay.getFullYear();
                bdViewMonth0 = bdDraftDay.getMonth();
                bdDraftHour = n.getHours();
                bdDraftMin = n.getMinutes();
            }
        }
        if (bdDraftHour === BD_CLOSE && bdDraftMin !== 0) {
            bdDraftMin = 0;
        }
        if (!isHourSelectable(bdDraftHour)) {
            const n = nextAvailableSlot();
            bdDraftDay = startOfLocalDay(n);
            bdViewYear = bdDraftDay.getFullYear();
            bdViewMonth0 = bdDraftDay.getMonth();
            bdDraftHour = n.getHours();
            bdDraftMin = n.getMinutes();
        } else if (!isMinuteSelectable(bdDraftMin)) {
            const pm = pickFirstValidMinuteForHour(bdDraftHour);
            if (pm !== null) bdDraftMin = pm;
        }
    }

    function renderCalendar() {
        bdTitleMonth.textContent = `${BD_MONTH_NAMES[bdViewMonth0]} ${bdViewYear}`;
        const first = new Date(bdViewYear, bdViewMonth0, 1).getDay();
        const offset = first === 0 ? 6 : first - 1;
        const daysInM = new Date(bdViewYear, bdViewMonth0 + 1, 0).getDate();
        const totalCells = Math.ceil((offset + daysInM) / 7) * 7;

        bdGrid.textContent = '';
        for (let i = 0; i < totalCells; i++) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'bd-cell';

            const dayNum = i - offset + 1;
            if (i < offset || dayNum > daysInM) {
                btn.classList.add('bd-cell--muted');
                btn.setAttribute('aria-hidden', 'true');
                bdGrid.appendChild(btn);
                continue;
            }

            const cellDate = new Date(bdViewYear, bdViewMonth0, dayNum);
            const cellStart = startOfLocalDay(cellDate);
            btn.textContent = String(dayNum);

            if (cellStart.getTime() < todayStart.getTime()) {
                btn.disabled = true;
                btn.classList.add('bd-cell--disabled');
            } else if (cellStart.getTime() > bookMaxEnd.getTime()) {
                btn.disabled = true;
                btn.classList.add('bd-cell--disabled');
            }

            if (cellStart.getTime() === todayStart.getTime()) {
                btn.classList.add('bd-cell--today');
            }
            if (
                bdDraftDay.getFullYear() === cellDate.getFullYear() &&
                bdDraftDay.getMonth() === cellDate.getMonth() &&
                bdDraftDay.getDate() === cellDate.getDate()
            ) {
                btn.classList.add('bd-cell--selected');
            }

            btn.addEventListener('click', () => {
                if (btn.disabled) return;
                bdDraftDay = startOfLocalDay(cellDate);
                afterDayChange();
                renderAll();
            });
            bdGrid.appendChild(btn);
        }

        if (bdPrev) bdPrev.disabled = viewYm() <= viewMinYm;
        if (bdNext) bdNext.disabled = viewYm() >= viewMaxYm;
    }

    function renderHoursMinutes() {
        bdHours.textContent = '';
        for (let h = BD_OPEN; h <= BD_CLOSE; h++) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'bd-hour-btn';
            b.textContent = String(h);
            b.disabled = !isHourSelectable(h);
            if (bdDraftHour === h) b.classList.add('is-active');
            b.addEventListener('click', () => {
                if (b.disabled) return;
                bdDraftHour = h;
                if (!isMinuteSelectable(bdDraftMin)) {
                    const pm = pickFirstValidMinuteForHour(h);
                    if (pm !== null) bdDraftMin = pm;
                }
                renderAll();
            });
            bdHours.appendChild(b);
        }

        bdMinutes.textContent = '';
        for (const m of QUARTERS) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'bd-min-btn';
            b.textContent = pad2(m);
            const disabled = !isMinuteSelectable(m);
            b.disabled = disabled;
            if (bdDraftMin === m && !disabled) b.classList.add('is-active');
            b.addEventListener('click', () => {
                if (b.disabled) return;
                bdDraftMin = m;
                renderAll();
            });
            bdMinutes.appendChild(b);
        }
    }

    function renderAll() {
        renderCalendar();
        renderHoursMinutes();
    }

    function openModal() {
        previouslyFocused = document.activeElement;
        const parsed = parseIsoLocal(hiddenInput.value);
        const base = parsed && parsed.getTime() > Date.now() ? parsed : nextAvailableSlot();

        bdDraftDay = startOfLocalDay(base);
        bdDraftHour = base.getHours();
        bdDraftMin = base.getMinutes();
        if (!QUARTERS.includes(bdDraftMin)) {
            const pm = pickFirstValidMinuteForHour(bdDraftHour);
            bdDraftMin = pm !== null ? pm : 0;
        }
        if (bdDraftHour === BD_CLOSE && bdDraftMin !== 0) {
            bdDraftMin = 0;
        }
        afterDayChange();

        bdViewYear = bdDraftDay.getFullYear();
        bdViewMonth0 = bdDraftDay.getMonth();

        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        displayInput.setAttribute('aria-expanded', 'true');
        renderAll();
        if (bdApply) bdApply.focus();
    }

    function closeModal() {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        displayInput.setAttribute('aria-expanded', 'false');
        if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
            previouslyFocused.focus();
        }
    }

    function applyAndClose() {
        const t = composeSlot();
        if (t.getTime() <= Date.now()) {
            showFormNotice('Выберите будущую дату и время', true);
            return;
        }
        hiddenInput.value = formatIsoForHidden(t);
        displayInput.value = formatDisplayRu(t);
        closeModal();
    }

    const parsedInit = parseIsoLocal(hiddenInput.value);
    if (parsedInit && parsedInit.getTime() > Date.now()) {
        displayInput.value = formatDisplayRu(parsedInit);
    }

    openBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal();
    });
    displayInput.addEventListener('click', () => openModal());

    if (bdCloseX) bdCloseX.addEventListener('click', closeModal);
    if (bdCancel) bdCancel.addEventListener('click', closeModal);
    if (bdApply) bdApply.addEventListener('click', applyAndClose);
    backdrop.addEventListener('click', closeModal);

    if (bdPrev) {
        bdPrev.addEventListener('click', () => {
            if (bdPrev.disabled) return;
            const d = addMonthsFromDate(new Date(bdViewYear, bdViewMonth0, 1), -1);
            bdViewYear = d.getFullYear();
            bdViewMonth0 = d.getMonth();
            renderAll();
        });
    }
    if (bdNext) {
        bdNext.addEventListener('click', () => {
            if (bdNext.disabled) return;
            const d = addMonthsFromDate(new Date(bdViewYear, bdViewMonth0, 1), 1);
            bdViewYear = d.getFullYear();
            bdViewMonth0 = d.getMonth();
            renderAll();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) {
            e.preventDefault();
            closeModal();
        }
    });
})();

// Обработка отправки формы
document.getElementById('bookingForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    const requiredFields = Array.from(this.querySelectorAll('[required]'));
    const hasEmptyFields = requiredFields.some((field) => !field.value.trim());

    if (hasEmptyFields) {
        showFormNotice('Заполните эти поля', true);
        return;
    }

    const name = document.getElementById('name')?.value.trim() || '';
    const phone = document.getElementById('phone')?.value.trim() || '';
    const service = document.getElementById('service')?.value.trim() || '';
    const datetime = document.getElementById('datetimeDisplay')?.value.trim() || '';
    const comment = document.getElementById('comment')?.value.trim() || '—';

    if (!window.emailjs || !isEmailJsConfigured()) {
        showFormNotice('Заявка сохранена. Для письма админу заполните EmailJS-настройки в script.js.', true);
        return;
    }

    try {
        await window.emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
            admin_email: EMAILJS_CONFIG.adminEmail,
            client_name: name,
            client_phone: phone,
            service_name: service,
            booking_datetime: datetime,
            comment_text: comment,
            submitted_at: new Date().toLocaleString('ru-RU'),
        });

        openBookingSuccessModal();
        this.reset();
        const datetimeInput = document.getElementById('datetime');
        const datetimeDisplay = document.getElementById('datetimeDisplay');
        if (datetimeInput) datetimeInput.value = '';
        if (datetimeDisplay) datetimeDisplay.value = '';
    } catch (error) {
        console.error('Ошибка отправки заявки:', error);
        showFormNotice('Не удалось отправить заявку. Попробуйте ещё раз.', true);
    }
});

// Анимация при скролле
const observerOptions = {
    threshold: 0.2,
    rootMargin: '0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

document.querySelectorAll('.section').forEach(section => {
    observer.observe(section);
});

// Предотвращение дефолтного скролла стрелками
window.addEventListener('keydown', (e) => {
    if (!scrollContainer) return;
    if (isVerticalLayout()) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const vw = scrollContainer.clientWidth;
        const delta = e.key === 'ArrowUp' ? -vw : vw;
        smoothScrollHorizontalTo(scrollContainer.scrollLeft + delta);
    }
});

// Эффект наведения на кликабельные элементы (кастомный курсор отключён — проверяем наличие)
const cursorEl = document.querySelector('.custom-cursor');
const hoverElements = document.querySelectorAll('button, .menu-item, .craft-card, .gallery-item, .timeline-year, .submit-btn, .book-btn');
if (cursorEl) {
    hoverElements.forEach((el) => {
        el.addEventListener('mouseenter', () => {
            cursorEl.style.transform = 'translate(-50%, -50%) scale(1.5)';
            cursorEl.style.borderColor = '#fff';
        });
        el.addEventListener('mouseleave', () => {
            cursorEl.style.transform = 'translate(-50%, -50%) scale(1)';
            cursorEl.style.borderColor = '#8B5FBF';
        });
    });
}