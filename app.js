// Логика приложения: рисует экраны из data.js, переключает вкладки и открывает подробности.

// Telegram и ВКонтакте подключаем при запуске (см. конец файла): их скрипты нужны, только если приложение открыто там
let tg = null;
let inTelegram = false;
let inVK = false;

const $ = (sel, root = document) => root.querySelector(sel);

// Экранируем текст, чтобы символы вроде < и & не ломали разметку
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Адрес для href/src: пропускаем только сайты, звонки, почту и свои файлы (img/...). Всё остальное
// (например, javascript:) заменяем на "#", чтобы опечатка или чужая правка в data.js не стала дырой
const url = (u) => esc(/^(https?:|tel:|mailto:|img\/)/i.test(String(u)) ? u : "#");

const icons = {
  fire: '<path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.4 2.6-5 3.4-8.4 1.9 1.2 2.6 3 2.6 4.6 1-.7 1.6-2 1.7-3.2 2 1.6 4.3 4 4.3 7 0 3.2-2.4 5.6-6 5.6z"/>',
  alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.1"/>',
  aid: '<path d="M12 6v12M6 12h12"/>',
  phone: '<path d="M5 4h4l1.5 4-2.2 1.4a11 11 0 006.3 6.3L16 13.5l4 1.5v4a1.5 1.5 0 01-1.6 1.5C10.6 20 4 13.4 3.5 5.6A1.5 1.5 0 015 4z"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>',
  door: '<path d="M6 21V4h12v17M3.5 21h17M14.5 12.5v.1"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  food: '<path d="M7 3v7.5M4.5 3v5a2.5 2.5 0 005 0V3M7 10.5V21M16.5 21V3c-2.2 1.3-3 4-3 7v4h3"/>',
  ball: '<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  shirt: '<path d="M8 4l4 2 4-2 4.5 3-2 4-2.5-1V20h-8V10l-2.5 1-2-4z"/>',
  shoe: '<path d="M3.5 17V8h5l2 4 7 1.5c1.7.4 3 1.6 3 3.5H3.5zM3.5 20h17"/>',
  nosmoke: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12M7 13.5h6"/>',
  broom: '<path d="M14 3l-3.5 9M7 12h7l2 9H5z"/>',
  card: '<rect x="3" y="6" width="18" height="12.5" rx="2"/><path d="M3 10h18M6.5 15h4"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  chevron: '<path d="M9 5l7 7-7 7"/>',
  check: '<path d="M5.5 12.5l4 4 9-9"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5.5H4.5V6H10"/>',
};
const svg = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;

const guideColors = { fire: "red", alert: "red", aid: "red" };

// Городской номер Великого Новгорода: код 8162
const tel = (phone) => `tel:+78162${phone.replace(/\D/g, "")}`;
const mapUrl = (q) => `https://yandex.ru/maps/?text=${encodeURIComponent(q)}`;
const STUDY_OFFICE = "97-42-14";

// ---------- Строительные блоки экранов ----------

// Обработчики нажатий: строки списков получают data-act, по нему находим функцию
const actions = {};
let actionId = 0;
function act(fn) {
  const id = "a" + actionId++;
  actions[id] = fn;
  return id;
}

function band(title, sub = "") {
  return `<header class="band"><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ""}</header>`;
}

function row(o) {
  const tag = o.href ? "a" : o.onClick ? "button" : "div";
  const attrs = [
    o.href ? `href="${url(o.href)}"` : "",
    o.external ? 'target="_blank" rel="noopener"' : "",
    o.onClick ? `data-act="${act(o.onClick)}"` : "",
  ].join(" ");
  const lead = o.photo
    ? `<img class="thumb" src="${url(o.photo)}" alt="" loading="lazy">`
    : o.icon ? `<span class="row-icon c-${o.color || "blue"}">${svg(o.icon)}</span>`
    : o.avatarPhoto ? `<img class="avatar avatar-photo" src="${url(o.avatarPhoto)}" alt="" loading="lazy">`
    : o.avatar ? drawnAvatar(o.avatar, o.avatarStrong) : "";
  return `
    <${tag} class="row${o.onClick || o.href ? " is-tappable" : ""}${lead ? " has-lead" : ""}" ${attrs}>
      ${lead}
      <span class="row-main">
        <span class="row-title">${esc(o.title)}</span>
        ${o.subtitle ? `<span class="row-sub">${esc(o.subtitle)}</span>` : ""}
      </span>
      ${o.value ? `<span class="row-value">${esc(o.value)}</span>` : ""}
      ${o.plate ? `<span class="plate" aria-label="Кабинет ${esc(o.plate)}">${esc(o.plate)}</span>` : ""}
      ${o.accessory || ""}
      ${o.chevron ? `<span class="row-chevron">${svg("chevron")}</span>` : ""}
    </${tag}>`;
}

function group(rows, caption = "", footer = "") {
  return `
    ${caption ? `<h2 class="group-caption">${esc(caption)}</h2>` : ""}
    <div class="group">${rows.join("")}</div>
    ${footer ? `<p class="group-footer">${esc(footer)}</p>` : ""}`;
}

function bindActions(root) {
  // Обработчик забираем из общего списка и сразу удаляем оттуда — иначе после каждой перерисовки
  // в памяти копились бы старые обработчики
  root.querySelectorAll("[data-act]").forEach((el) => {
    const fn = actions[el.dataset.act];
    if (!fn) return; // уже привязан раньше
    delete actions[el.dataset.act];
    el.addEventListener("click", (e) => fn(e, el));
  });
}

// ---------- Подробности (второй экран) ----------

let lastScroll = 0;

function openDetail(html) {
  if ($("#detail").hidden) {
    lastScroll = window.scrollY;
    // Запись в истории браузера, чтобы системная кнопка «Назад» вернула на раздел
    try { history.pushState({ detail: true }, ""); } catch { /* без истории — только кнопка «Назад» в шапке */ }
  }
  const body = $("#detailBody");
  body.innerHTML = html;
  bindActions(body);
  $("#screens").hidden = true;
  $(".tabs").hidden = true;
  $("#detail").hidden = false;
  window.scrollTo({ top: 0 });
  updateBack();
}

function closeDetail() {
  if ($("#detail").hidden) return;
  $("#detail").hidden = true;
  $("#screens").hidden = false;
  $(".tabs").hidden = false;
  window.scrollTo({ top: lastScroll });
  updateBack();
}

// «Назад» в шапке и в Telegram идёт через историю — так всё работает одинаково с кнопкой телефона
function goBack() {
  if (history.state && (history.state.detail || history.state.jump)) history.back();
  else if (!$("#detail").hidden) closeDetail();
  else if (jumpFrom) returnFromJump();
}
window.addEventListener("popstate", () => {
  if (!$("#detail").hidden) closeDetail();
  else if (jumpFrom) returnFromJump();
});

// Переход в другой раздел по ссылке (например, «Где поесть» с главной): как у подробностей,
// появляется «Назад», который возвращает туда, откуда пришёл
let jumpFrom = null;
const currentView = () => VIEWS.find((v) => !$("#view-" + v).hidden) || "home";

function jumpTo(name, setup) {
  const from = currentView();
  if (!$("#detail").hidden) closeDetail();
  showView(name);
  if (setup) setup();
  try { history.pushState({ jump: from }, "", "#" + name); } catch { /* без истории — только кнопка «Назад» */ }
  jumpFrom = from;
  updateBack();
}

function returnFromJump() {
  const to = jumpFrom;
  jumpFrom = null;
  showView(to);
  updateBack();
}

// Кнопка «Назад»: в Telegram — его кнопка в шапке, в браузере — своя полоса сверху
function updateBack() {
  const detailOpen = !$("#detail").hidden;
  if (inTelegram) {
    if (detailOpen || jumpFrom) tg.BackButton.show(); else tg.BackButton.hide();
  }
  $("#jumpBar").hidden = inTelegram || detailOpen || !jumpFrom;
}
$("#backBtn").addEventListener("click", goBack);
$("#jumpBack").addEventListener("click", goBack);

// ---------- Главная ----------

// Отметки (правила, чек-лист) храним на телефоне. Если хранилище недоступно — приложение всё равно работает.
function loadSet(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); } catch { return new Set(); }
}
function saveSet(key, set) {
  try { localStorage.setItem(key, JSON.stringify([...set])); } catch { /* живём без сохранения */ }
}

const READ_KEY = "infoptk-read-rules";
const readRules = loadSet(READ_KEY);
const CHECK_KEY = "infoptk-checklist";
const checked = loadSet(CHECK_KEY);

function renderHome() {
  const c = DATA.contacts;
  const total = DATA.rules.length;
  const done = DATA.rules.filter((r) => readRules.has(r.id)).length;
  const view = $("#view-home");
  view.innerHTML = `
    <header class="band band-home">
      <img class="logo" src="img/novsu-white.svg" alt="НовГУ имени Ярослава Мудрого">
      <img class="emblem" src="img/novsu-emblem-white.svg" alt="">
      <h1><img class="app-mark" src="img/logo.svg" alt="">Инфо ПТК</h1>
      <p>Политехнический колледж НовГУ, всё для первокурсника в одном месте</p>
    </header>

    <a class="schedule" href="${url(DATA.scheduleUrl)}" target="_blank" rel="noopener">
      <span class="schedule-text">
        <b>Расписание</b>
        <span>Пары и замены на сайте НовГУ</span>
      </span>
      ${svg("external")}
    </a>

    <button class="now" id="nowCard" data-act="${act(openBells)}"></button>

    ${group([
      row({ title: "Учебная часть", value: STUDY_OFFICE, href: tel(STUDY_OFFICE) }),
      row({ title: "Что делать при пожаре", chevron: true, onClick: () => openGuide(DATA.safety[0]) }),
      row({ title: "Где поесть", chevron: true, onClick: () => jumpTo("nearby", () => setNearbyKind("food")) }),
      row({
        title: "Правила колледжа", chevron: true, onClick: () => jumpTo("rules", scrollToRules),
        value: done === total ? "всё прочитано" : `прочитано ${done} из ${total}`,
      }),
    ])}

    ${group([
      row({ title: c.address, subtitle: "Открыть на карте", href: mapUrl(`Великий Новгород, ${c.address}`), external: true }),
      row({ title: c.phone, subtitle: `Приёмная, с ${c.hours.replace("–", " до ")}`, href: tel(c.phone) }),
      row({ title: c.phone2, subtitle: "Телефон и факс", href: tel(c.phone2) }),
      row({ title: c.email, subtitle: "Почта колледжа", href: `mailto:${c.email}` }),
    ], "Колледж")}
  `;
  bindActions(view);
  updateNow();
}

// ---------- Звонки и «что сейчас» ----------

const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

// Время по Москве — колледж в Великом Новгороде, даже если телефон настроен на другой часовой пояс
function moscowNow() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Moscow", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (t) => parts.find((x) => x.type === t).value;
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  // date — календарная дата по Москве (полночь UTC этого дня), чтобы считать праздники и следующий учебный день
  const date = new Date(Date.UTC(Number(get("year")), Number(get("month")) - 1, Number(get("day"))));
  return { day, min: Number(get("hour")) * 60 + Number(get("minute")), date };
}

// ---------- Праздники и каникулы ----------

const pad2 = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
const md = (d) => `${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

// Почему в этот день нет пар: "summer", "holiday", "weekend" или null — учебный день
function dayOff(d) {
  const c = DATA.calendar;
  const m = md(d);
  if (m >= c.summer.from && m <= c.summer.to) return "summer";
  if (c.holidays.includes(m) || c.extraDaysOff.includes(ymd(d))) return "holiday";
  if (!DATA.studyDays.includes(d.getUTCDay())) return "weekend";
  return null;
}

const WEEKDAYS_IN = ["В воскресенье", "В понедельник", "Во вторник", "В среду", "В четверг", "В пятницу", "В субботу"];
const MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

// «Завтра», «В понедельник» или «В четверг, 8 января» — когда следующий учебный день
function nextStudyDayLabel(today) {
  for (let i = 1; i <= 75; i++) {
    const d = addDays(today, i);
    if (dayOff(d)) continue;
    if (i === 1) return "Завтра";
    if (i <= 6) return WEEKDAYS_IN[d.getUTCDay()];
    return `${WEEKDAYS_IN[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS_GEN[d.getUTCMonth()]},`;
  }
  return "В следующий учебный день";
}

const plural = (n, one, few, many) => {
  const a = n % 10, b = n % 100;
  return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many;
};
const fmtLeft = (m) => {
  if (m < 60) return `${m} ${plural(m, "минута", "минуты", "минут")}`;
  const h = Math.floor(m / 60), r = m % 60;
  return `${h} ч${r ? ` ${r} мин` : ""}`;
};

// Что сейчас происходит: { title, sub, progress (0..1 или null) }
function bellStatus({ min, date }) {
  const bells = DATA.bells;
  const first = toMin(bells[0].parts[0][0]);
  const last = toMin(bells[bells.length - 1].parts[1][1]);
  const lunch = DATA.lunch;
  const firstAt = bells[0].parts[0][0];
  const off = dayOff(date);
  if (off === "summer") return { title: "Летние каникулы", sub: "Пары начнутся в сентябре", progress: null };
  if (off) {
    return {
      title: off === "holiday" ? "Сегодня праздник, пар нет" : "Сегодня выходной",
      sub: `${nextStudyDayLabel(date)} 1 пара в ${firstAt}`, progress: null,
    };
  }
  if (min < first) return { title: `До начала пар ${fmtLeft(first - min)}`, sub: `1 пара в ${firstAt}`, progress: null };
  if (min >= last) {
    return { title: "Пары на сегодня закончились", sub: `${nextStudyDayLabel(date)} 1 пара в ${firstAt}`, progress: null };
  }
  for (let i = 0; i < bells.length; i++) {
    const b = bells[i];
    const [a1, a2] = b.parts[0].map(toMin);
    const [b1, b2] = b.parts[1].map(toMin);
    if (min >= a1 && min < b2) {
      const progress = (min - a1) / (b2 - a1);
      // 5 и 6 пары есть не у всех групп — так и пишем
      const late = b.n >= 5 ? "Если она есть у твоей группы. " : "";
      if (min < a2) return { title: `Идёт ${b.n} пара`, sub: `${late}До перемены ${fmtLeft(a2 - min)}`, progress };
      if (min < b1) return { title: `${b.n} пара, перемена`, sub: `${late}Продолжение через ${fmtLeft(b1 - min)}, в ${b.parts[1][0]}`, progress };
      // Вторая половина 2 пары: первокурсников отпускают на обед раньше
      if (lunch.firstYear && b.parts[1][1] === lunch.start) {
        const fy = toMin(lunch.firstYear);
        if (min < fy) return { title: `Идёт ${b.n} пара`, sub: `Первокурсники идут на обед через ${fmtLeft(fy - min)}, остальные — в ${lunch.start}`, progress };
        return { title: "Первокурсники на обеде", sub: `У остальных пара до ${lunch.start}`, progress };
      }
      return { title: `Идёт ${b.n} пара`, sub: `${late}До конца пары ${fmtLeft(b2 - min)}`, progress };
    }
    const next = bells[i + 1];
    if (next && min >= b2 && min < toMin(next.parts[0][0])) {
      const isLunch = b.parts[1][1] === lunch.start;
      return {
        title: isLunch ? "Большая перемена, обед" : "Перемена",
        sub: `${next.n} пара в ${next.parts[0][0]}, через ${fmtLeft(toMin(next.parts[0][0]) - min)}`,
        progress: null,
      };
    }
  }
  return { title: "Расписание звонков", sub: "Нажми, чтобы посмотреть", progress: null };
}

function updateNow() {
  const card = $("#nowCard");
  if (!card) return;
  const st = bellStatus(moscowNow());
  card.innerHTML = `
    <span class="now-text">
      <b>${esc(st.title)}</b>
      <span>${esc(st.sub)}</span>
      ${st.progress !== null ? `<span class="now-bar"><i style="width:${Math.round(st.progress * 100)}%"></i></span>` : ""}
    </span>
    <span class="now-link">Звонки${svg("chevron")}</span>`;
}
setInterval(updateNow, 30 * 1000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) updateNow(); });

function openBells() {
  const { min, date } = moscowNow();
  const today = !dayOff(date);
  const rows = DATA.bells.map((b) => {
    const isNow = today && min >= toMin(b.parts[0][0]) && min < toMin(b.parts[1][1]);
    return `
      <div class="bell${isNow ? " is-now" : ""}">
        <span class="bell-n">${b.n}</span>
        <span class="bell-main">
          <b>${b.parts[0][0]} – ${b.parts[1][1]}</b>
          <span>Перемена ${b.parts[0][1]}–${b.parts[1][0]}</span>
        </span>
        ${isNow ? '<span class="bell-tag">сейчас</span>' : ""}
      </div>
      ${b.parts[1][1] === DATA.lunch.start ? `
        <div class="bell bell-lunch">
          <span class="bell-n">${svg("food")}</span>
          <span class="bell-main">
            <b>Обед ${DATA.lunch.start} – ${DATA.lunch.end}</b>
            <span>Первокурсников отпускают раньше, в ${DATA.lunch.firstYear}</span>
          </span>
        </div>` : ""}`;
  }).join("");
  openDetail(`
    <h1 class="detail-title">Звонки</h1>
    <p class="detail-text">Пара длится 1 час 40 минут: два раза по 45 минут и перемена 10 минут посередине. Между парами тоже 10 минут, а после 2 пары — большая перемена на обед.</p>
    <div class="group bells">${rows}</div>
    <p class="group-footer">Пары идут с понедельника по субботу. Какие пары у твоей группы — смотри в расписании на сайте НовГУ.</p>
    ${group([row({ title: "Расписание групп", subtitle: "Сайт НовГУ, раздел колледжа", href: DATA.scheduleUrl, external: true, chevron: true })])}
  `);
}

// ---------- Чек-лист первой недели ----------

const checkedCount = () => DATA.checklist.filter((i) => checked.has(i.id)).length;

function checklistGo(link) {
  if (link === "fire") return openGuide(DATA.safety[0]);
  jumpTo(link);
}

function openChecklist() {
  const render = () => {
    const done = checkedCount();
    const total = DATA.checklist.length;
    $("#detailBody").innerHTML = `
      <h1 class="detail-title">Первая неделя</h1>
      <p class="detail-text">Отмечай, что уже сделал. Отметки сохраняются только на этом телефоне.</p>
      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}">${
        DATA.checklist.map((i) => `<i${checked.has(i.id) ? ' class="on"' : ""}></i>`).join("")}</div>
      <div class="group checklist">
        ${DATA.checklist.map((i) => `
          <div class="check-row">
            <button class="check${checked.has(i.id) ? " is-on" : ""}" data-id="${esc(i.id)}" aria-pressed="${checked.has(i.id)}" aria-label="${esc(i.title)}">${svg("check")}</button>
            <span class="row-main">
              <span class="row-title">${esc(i.title)}</span>
              <span class="row-sub">${esc(i.note)}</span>
            </span>
            ${i.link === "schedule"
              ? `<a class="check-go" href="${url(DATA.scheduleUrl)}" target="_blank" rel="noopener" aria-label="Открыть расписание">${svg("chevron")}</a>`
              : i.link ? `<button class="check-go" data-go="${esc(i.link)}" aria-label="Перейти">${svg("chevron")}</button>` : ""}
          </div>`).join("")}
      </div>
      <p class="group-footer center">${done === total ? "Всё сделано, ты готов к учёбе." : `Сделано ${done} из ${total}`}</p>
    `;
    $("#detailBody").querySelectorAll(".check").forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.id;
      checked.has(id) ? checked.delete(id) : checked.add(id);
      saveSet(CHECK_KEY, checked);
      if (inTelegram) tg.HapticFeedback.selectionChanged();
      render();
      renderRules();
    }));
    // Нажатие на текст пункта тоже ставит отметку — так удобнее на телефоне
    $("#detailBody").querySelectorAll(".check-row .row-main").forEach((t) => t.addEventListener("click", () => t.parentElement.querySelector(".check").click()));
    $("#detailBody").querySelectorAll(".check-go").forEach((b) => b.addEventListener("click", () => checklistGo(b.dataset.go)));
  };
  openDetail("");
  render();
}

// ---------- Словарик ----------

function openGlossary() {
  openDetail(`
    <h1 class="detail-title">Словарик первокурсника</h1>
    <p class="detail-text">Слова, которые ты будешь слышать в первые недели.</p>
    <div class="group glossary">
      ${DATA.glossary.map((g) => `
        <details class="term">
          <summary><span>${esc(g.term)}</span>${svg("chevron")}</summary>
          <p>${esc(g.text)}</p>
        </details>`).join("")}
    </div>
  `);
}

// ---------- Важное: выплаты, общежитие, справки ----------

function openImportant(it) {
  const contactRows = [];
  it.contacts.forEach((c) => {
    contactRows.push(row({
      title: c.title,
      subtitle: c.ext ? `${c.sub}. Добавочный ${c.ext}` : c.sub,
      value: c.phone, href: tel(c.phone),
    }));
    if (c.email) contactRows.push(row({ title: c.email, subtitle: "Почта", href: `mailto:${c.email}` }));
  });
  const hasAsk = it.blocks.some((b) => b.items.some((x) => x.ask));
  openDetail(`
    <h1 class="detail-title">${esc(it.title)}</h1>
    <p class="detail-text">${esc(it.lead)}</p>
    ${it.facts ? `<div class="facts">${it.facts.map(([big, small]) => `<div class="fact"><b>${esc(big)}</b><span>${esc(small)}</span></div>`).join("")}</div>` : ""}
    ${it.blocks.map((b) => `
      <h2 class="group-caption">${esc(b.title)}</h2>
      <ul class="points">${b.items.map((x) => `<li>${esc(x.t)}${x.ask ? '<span class="ask">Уточнить в колледже</span>' : ""}</li>`).join("")}</ul>`).join("")}
    ${contactRows.length ? group(contactRows, "Контакты", "Нажми на номер, чтобы позвонить. Добавочный называй после ответа на 97-42-06.") : ""}
    ${it.sources.length ? group(it.sources.map((src) => row({ title: src.title, href: src.link, external: true, chevron: true })), "Источник",
      hasAsk ? "Пункты с пометкой «Уточнить в колледже» на сайте прямо не написаны." : "") : ""}
  `);
}

// ---------- Безопасность ----------

function openGuide(g) {
  openDetail(`
    <div class="detail-hero">
      <span class="row-icon big c-${guideColors[g.kind]}">${svg(g.kind)}</span>
      <h1>${esc(g.title)}</h1>
      <p>${esc(g.lead)}</p>
    </div>
    ${g.sections.map((sec) => `
      <h2 class="group-caption">${esc(sec.title)}</h2>
      <ol class="steps">${sec.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>`).join("")}
    ${group(g.sources.map((src) => row({ title: src.title, href: src.link, external: true, chevron: true })), "Источники")}
  `);
}

function renderSafety() {
  const view = $("#view-safety");
  view.innerHTML = `
    ${band("Безопасность", "Официальные инструкции на случай ЧС")}
    ${group(DATA.safety.map((g) => row({
      icon: g.kind, color: guideColors[g.kind], title: g.title, subtitle: g.lead, chevron: true,
      onClick: () => openGuide(g),
    })), "Если что-то случилось")}
    ${group(DATA.emergency.map((e) => row({
      icon: "phone", color: "red", title: e.number, subtitle: e.label, href: `tel:${e.number}`,
      accessory: `<span class="row-action">${inTelegram ? "Скопировать" : "Позвонить"}</span>`,
    })), "Экстренные номера", "Звонок на 112 бесплатный и проходит даже без SIM-карты.")}
  `;
  bindActions(view);
}

// ---------- Правила ----------

function toggleRule(id) {
  readRules.has(id) ? readRules.delete(id) : readRules.add(id);
  saveSet(READ_KEY, readRules);
  if (inTelegram) tg.HapticFeedback.selectionChanged();
}

// Следующее непрочитанное правило после текущего (по кругу)
function nextUnreadRule(r) {
  const i = DATA.rules.indexOf(r);
  const order = [...DATA.rules.slice(i + 1), ...DATA.rules.slice(0, i)];
  return order.find((x) => !readRules.has(x.id)) || null;
}

function openRule(r) {
  const render = () => {
    const isRead = readRules.has(r.id);
    const pos = DATA.rules.indexOf(r) + 1;
    openDetail(`
      <p class="rule-pos">Правило ${pos} из ${DATA.rules.length}</p>
      <h1 class="detail-title">${esc(r.title)}</h1>
      <p class="detail-text">${esc(r.text)}</p>
      ${r.points ? `<ul class="points">${r.points.map((pt) => `<li>${esc(pt.t)}${pt.ask ? '<span class="ask">Уточнить в колледже</span>' : ""}</li>`).join("")}</ul>` : ""}
      ${r.sources ? `<p class="rule-source">${esc(DATA.rulesDoc.title)}, ${esc(r.sources).replace(/(п\.|ст\.|№) /g, "$1&nbsp;")}</p>` : ""}
      <button class="primary${isRead ? " is-done" : ""}" data-act="${act(() => {
        const wasRead = readRules.has(r.id);
        toggleRule(r.id);
        renderRules();
        renderHome();
        if (wasRead) return render(); // сняли отметку — остаёмся на этом правиле
        const next = nextUnreadRule(r);
        if (next) {
          showToast(`Отмечено. Дальше: «${next.title}»`);
          openRule(next);
        } else {
          showToast("Все правила прочитаны");
          goBack();
        }
      })}">
        ${isRead ? svg("check") + "Ознакомлен" : "Я ознакомился"}
      </button>
      ${isRead ? '<p class="group-footer center">Нажми ещё раз, чтобы снять отметку.</p>' : '<p class="group-footer center">После отметки откроется следующее правило.</p>'}
    `);
  };
  render();
}

// Прокрутить вкладку «Студенту» к правилам (переход с главной)
function scrollToRules() {
  const cap = $("#rulesCaption");
  if (cap) requestAnimationFrame(() => window.scrollTo({ top: cap.getBoundingClientRect().top + window.scrollY - 12 }));
}

// Вкладка «Студенту»: первая неделя, правила колледжа, важное (выплаты, общежитие, справки)
function renderRules() {
  const view = $("#view-rules");
  const total = DATA.rules.length;
  const done = DATA.rules.filter((r) => readRules.has(r.id)).length;
  view.innerHTML = `
    ${band("Студенту", "Первая неделя, правила и всё о выплатах и документах")}

    ${group([
      row({ title: "Чек-лист первой недели", value: `${checkedCount()} из ${DATA.checklist.length}`, chevron: true, onClick: openChecklist }),
      row({ title: "Словарик первокурсника", subtitle: "Куратор, сессия, пересдача и другие слова", chevron: true, onClick: openGlossary }),
    ], "Первая неделя", "Звонки — на главной, нажми на карточку с текущей парой.")}

    ${group(DATA.important.map((it) => row({ title: it.title, subtitle: it.sub, chevron: true, onClick: () => openImportant(it) })),
      "Важное", "Кому положено, какие документы нужны и куда идти.")}

    <h2 class="group-caption" id="rulesCaption">Правила колледжа: прочитано ${done} из ${total}</h2>
    <div class="bar bar-tight" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}">${DATA.rules.map((r) => `<i${readRules.has(r.id) ? ' class="on"' : ""}></i>`).join("")}</div>
    ${group(DATA.rules.map((r) => row({
      title: r.title, chevron: true, onClick: () => openRule(r),
      accessory: readRules.has(r.id) ? `<span class="row-check" aria-label="Прочитано">${svg("check")}</span>` : "",
    })).concat([row({ title: "Полный текст правил", subtitle: DATA.rulesDoc.title, href: DATA.rulesDoc.link, external: true, chevron: true })]), "",
      "Правила составлены по официальному документу НовГУ. Пункты с пометкой «Уточнить в колледже» стоит проверить у куратора.")}

  `;
  bindActions(view);
}

// ---------- Педагоги и контакты ----------

let peopleQuery = "";
let peopleGroup = "Все";

const initials = (name) => { const [last, first] = name.split(" "); return first[0] + last[0]; };

// Рисованная аватарка для тех, у кого нет фото. Одна и та же для человека: вариант выбирается по ФИО.
// Женщина или мужчина — по отчеству (-вна, -чна).
const AV = {
  skin: ["#F2D3B8", "#EBC5A4", "#DDAE8A"],
  hair: ["#3A2A21", "#5E4130", "#8A6440", "#26262B", "#9A9AA2", "#A5532F"],
  shirt: ["#002FA7", "#4A6FD1", "#5E6678", "#2F7A5B"],
  male: [
    "M21 26C20 15 26 11 32 11C39 11 44 15 43 26C41 20 37 18 32 18C27 18 23 20 21 26Z",
    "M21 27C19 14 27 10 34 11C41 12 45 18 43 27C42 22 40 19 36 18C31 21 25 21 21 27Z",
    "M21 24C21 17 25 13 32 13C39 13 43 17 43 24C42 21 40 20 38 20H26C24 20 22 21 21 24Z",
  ],
  beard: "M21 28C22 39 27 42 32 42C37 42 42 39 43 28C41 34 37 35 32 35C27 35 23 34 21 28Z",
  femaleBack: [
    "M18 30C17 14 25 9 32 9C39 9 47 14 46 30L47 47C42 49 22 49 17 47Z",
    "M19 32C17 15 25 10 32 10C39 10 47 15 45 32C44 36 41 37 40 36H24C22 37 20 36 19 32Z",
    "M32 3A6 6 0 1 1 31.99 3Z",
  ],
  fringe: "M21 26C21 16 27 12 33 12C39 12 43 16 43 26C38 22 31 20 27 17C25 21 23 24 21 26Z",
};
function drawnAvatar(name, strong, big) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  const pick = (arr, k) => arr[Math.floor(h / k) % arr.length];
  const female = /(вна|чна)$/.test(name.trim().split(" ").pop() || "");
  const skin = pick(AV.skin, 1), hair = pick(AV.hair, 3), shirt = pick(AV.shirt, 7);
  const back = female ? `<path d="${pick(AV.femaleBack, 11)}" fill="${hair}"/>` : "";
  const front = female ? `<path d="${AV.fringe}" fill="${hair}"/>`
    : `<path d="${pick(AV.male, 11)}" fill="${hair}"/>${h % 5 === 0 ? `<path d="${AV.beard}" fill="${hair}"/>` : ""}`;
  return `<span class="avatar avatar-drawn${strong ? " is-strong" : ""}${big ? " big" : ""}" aria-hidden="true"><svg viewBox="0 0 64 64">
    ${back}
    <path d="M10 66C10 49 20 43 32 43C44 43 54 49 54 66Z" fill="${strong ? "#FFFFFF" : shirt}"/>
    <path d="M27 36H37V45C35 47 29 47 27 45Z" fill="${skin}" opacity=".85"/>
    <ellipse cx="32" cy="28" rx="11" ry="12.5" fill="${skin}"/>
    ${front}
  </svg></span>`;
}

// По справочнику колледжа: на 97-42-06 внутренний номер называют как добавочный, через вахту 97-42-15 — тоже
const MAIN_LINE = "97-42-06";
function phoneHint(p) {
  if (!p.phone || !p.ext) return "";
  if (p.phone === MAIN_LINE) return `Набери ${MAIN_LINE} и назови добавочный ${p.ext}. Или позвони на вахту 97-42-15 и попроси соединить.`;
  return `Если не дозвонишься, набери ${MAIN_LINE} и назови добавочный ${p.ext}.`;
}

function openPerson(p) {
  const c = DATA.contacts;
  const rows = [];
  rows.push(p.room
    ? row({ title: "Кабинет", plate: p.room })
    : row({ title: "Кабинет", subtitle: "Можно уточнить в учебной части в 207 кабинете", value: STUDY_OFFICE, href: tel(STUDY_OFFICE) }));
  if (p.phone) rows.push(row({ title: p.phone, subtitle: p.ext ? (p.phone === MAIN_LINE ? `Добавочный ${p.ext}` : `Прямой, внутренний ${p.ext}`) : "Городской", href: tel(p.phone) }));
  if (p.email) rows.push(row({ title: p.email, subtitle: "Почта", href: `mailto:${p.email}` }));
  rows.push(row({ title: c.email, subtitle: "Почта колледжа", href: `mailto:${c.email}` }));
  openDetail(`
    <div class="detail-hero">
      ${p.photo
        ? `<img class="avatar big avatar-photo" src="${url(p.photo)}" alt="${esc(p.name)}">`
        : drawnAvatar(p.name, p.group === "Руководство", true)}
      <h1>${esc(p.name)}</h1>
      <p>${esc(p.role)}</p>
    </div>
    ${p.extra ? `<p class="person-extra">${esc(p.extra)}</p>` : ""}
    ${group(rows, "", phoneHint(p))}
  `);
}

function renderPeople() {
  const view = $("#view-people");
  view.innerHTML = `
    ${band("Педагоги", "Руководство, помощь студентам и преподаватели колледжа")}
    <div class="search">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/></svg>
      <input type="search" id="peopleSearch" placeholder="Фамилия или должность" aria-label="Поиск сотрудника" autocomplete="off">
    </div>
    <div class="segments" role="group" aria-label="Кто нужен">
      ${["Все", ...DATA.staffGroups].map((g) => `
        <button class="segment" data-group="${esc(g)}" aria-pressed="${g === peopleGroup}">${esc(g)}</button>`).join("")}
    </div>
    <div id="peopleList"></div>
  `;

  const input = $("#peopleSearch");
  input.value = peopleQuery;
  input.addEventListener("input", () => {
    peopleQuery = input.value;
    renderPeopleList();
  });

  view.querySelectorAll(".segment").forEach((seg) => {
    seg.addEventListener("click", () => {
      peopleGroup = seg.dataset.group;
      view.querySelectorAll(".segment").forEach((s) => s.setAttribute("aria-pressed", String(s === seg)));
      renderPeopleList();
    });
  });

  renderPeopleList();
}

function renderPeopleList() {
  const norm = (s) => s.toLowerCase().replace(/ё/g, "е");
  const q = norm(peopleQuery.trim());
  const match = (p) => !q || [p.name, p.role, p.room || "", p.extra || ""].some((f) => norm(f).includes(q));
  const groups = (peopleGroup === "Все" ? DATA.staffGroups : [peopleGroup])
    .map((g) => [g, DATA.staff.filter((p) => p.group === g && match(p))])
    .filter(([, list]) => list.length);

  const box = $("#peopleList");
  box.innerHTML = groups.length
    ? groups.map(([g, list]) => group(list.map((p) => row({
        avatarPhoto: p.photo, avatar: p.name, avatarStrong: p.group === "Руководство", title: p.name, subtitle: p.role, plate: p.room, chevron: true,
        onClick: () => openPerson(p),
      })), g)).join("")
    : `<p class="empty">Никого не нашли. Проверь фамилию или выбери «Все».</p>`;
  bindActions(box);
}

// ---------- Рядом: еда и спорт ----------

let nearbyKind = "food";
function setNearbyKind(kind) {
  nearbyKind = kind;
  renderNearby();
}

function openPlace(p) {
  const facts = [
    row({ title: "Где", value: p.where }),
    ...(p.walk ? [row({ title: "Пешком от колледжа", value: p.walk })] : []),
    ...(p.price ? [row({ title: "Цена", value: p.price })] : []),
    ...(p.hours ? [row({ title: "Часы", value: p.hours })] : []),
  ];
  const links = [
    ...(p.map ? [row({ title: "Открыть на карте", href: mapUrl(p.map), external: true, chevron: true })] : []),
    ...(p.link ? [row({ title: "Сайт", subtitle: p.link.replace(/^https?:\/\//, ""), href: p.link, external: true, chevron: true })] : []),
    ...(p.link2 ? [row({ title: p.link2Title, href: p.link2, external: true, chevron: true })] : []),
  ];
  openDetail(`
    ${p.photo ? `<img class="hero-photo" src="${url(p.photo)}" alt="${esc(p.name)}">` : ""}
    <h1 class="detail-title">${esc(p.name)}</h1>
    <p class="detail-text">${esc(p.note)}</p>
    ${group(facts)}
    ${links.length ? group(links) : ""}
  `);
}

function renderNearby() {
  const view = $("#view-nearby");
  const list = DATA[nearbyKind];
  // Раздел места: свой (section) или по умолчанию «В колледже» / «Рядом с колледжем»
  const sectionOf = (p) => p.section || (!p.walk && !p.map ? "В колледже" : "Рядом с колледжем");
  const sections = [...new Set(list.map(sectionOf))];
  const placeRow = (p) => row({
    photo: p.photo,
    title: p.name, subtitle: p.price || p.where, value: p.walk, chevron: true, onClick: () => openPlace(p),
  });
  view.innerHTML = `
    ${band("Рядом", "Где поесть и заняться спортом")}
    <div class="switch" role="group" aria-label="Что показать">
      <button class="switch-btn" aria-pressed="${nearbyKind === "food"}" data-kind="food">${svg("food")}Еда</button>
      <button class="switch-btn" aria-pressed="${nearbyKind === "sport"}" data-kind="sport">${svg("ball")}Спорт</button>
    </div>
    ${sections.map((name) => group(list.filter((p) => sectionOf(p) === name).map(placeRow), name)).join("")}
    <p class="group-footer">Время пешком примерное. Цены по данным 2ГИС и сайта НовГУ на октябрь 2026. Если место закрылось, напиши команде.</p>
  `;
  view.querySelectorAll(".switch-btn").forEach((b) => b.addEventListener("click", () => {
    nearbyKind = b.dataset.kind;
    renderNearby();
  }));
  bindActions(view);
}

// ---------- Внешние ссылки в Telegram ----------

// Короткая подсказка внизу экрана
let toastTimer = 0;
function showToast(text) {
  let el = $("#toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.classList.add("is-shown");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-shown"), 3500);
}

function copyText(text) {
  const fallback = () => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch { /* не вышло — номер всё равно виден в подсказке */ }
    ta.remove();
  };
  try {
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).catch(fallback);
    else fallback();
  } catch { fallback(); }
}

// Номер для подсказки: короткие (112) как есть, городские — полностью
function prettyPhone(href) {
  const d = href.replace(/\D/g, "");
  if (d.length <= 3) return d;
  if (d.length === 11) return `+7 (${d.slice(1, 5)}) ${d.slice(5, 7)}-${d.slice(7, 9)}-${d.slice(9)}`;
  return "+" + d;
}

// Позвонить по ссылке tel: можно только с телефона. На компьютере браузер показывает ошибку
// «не найдено приложение» — там номер копируем, как в Telegram.
const canDial = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

document.addEventListener("click", (e) => {
  // В Telegram ссылки на сайты открываем через его метод, иначе они не откроются
  const ext = inTelegram && e.target.closest('a[target="_blank"]');
  if (ext) {
    e.preventDefault();
    tg.openLink(ext.href);
    return;
  }
  // Звонок и почта внутри Telegram не открываются, звонок с компьютера — тоже: копируем и подсказываем
  const call = e.target.closest('a[href^="tel:"], a[href^="mailto:"]');
  if (call && (inTelegram || (!canDial && call.getAttribute("href").startsWith("tel:")))) {
    e.preventDefault();
    const href = call.getAttribute("href");
    if (href.startsWith("tel:")) {
      const num = prettyPhone(href);
      copyText(num);
      showToast(num.length <= 3 ? `Набери ${num} в телефоне. Номер скопирован` : `Номер ${num} скопирован. ${canDial ? "Вставь его в «Телефон»" : "Позвони с телефона"}`);
    } else {
      const mail = href.slice(7);
      copyText(mail);
      showToast(`Почта ${mail} скопирована`);
    }
    if (inTelegram && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred("success");
  }
});

// ---------- Вкладки ----------

const VIEWS = ["home", "safety", "rules", "people", "nearby"];

function showView(name) {
  if (!$("#detail").hidden) closeDetail(); // запись подробностей в истории ниже заменится на раздел
  document.querySelectorAll(".tabs [role=tab]").forEach((tab) => {
    tab.setAttribute("aria-selected", String(tab.dataset.view === name));
  });
  document.querySelectorAll(".screen").forEach((v) => {
    v.hidden = v.id !== "view-" + name;
  });
  window.scrollTo({ top: 0 });
  history.replaceState(null, "", "#" + name);
}

document.querySelectorAll(".tabs [role=tab]").forEach((tab) => {
  tab.addEventListener("click", () => {
    jumpFrom = null; // ушли на вкладку сами — «Назад» к прошлому разделу больше не нужен
    showView(tab.dataset.view);
    updateBack();
  });
});

// Telegram и браузер до 10 минут держат старую страницу в памяти. Проверяем, не вышла ли новая версия,
// и если вышла — один раз перезагружаемся. Работает только на сайте (там у файлов есть ?v=номер версии).
(function checkNewVersion() {
  const own = document.querySelector('script[src*="app.js?v="]');
  if (!own || !window.fetch) return;
  const current = own.getAttribute("src").split("?v=")[1];
  fetch(location.pathname + "?check=" + Date.now(), { cache: "no-store" })
    .then((r) => (r.ok ? r.text() : ""))
    .then((html) => {
      const m = html.match(/app\.js\?v=(\d+)/);
      if (!m || m[1] === current) return;
      let tried = "";
      try { tried = sessionStorage.getItem("infoptk-reloaded"); } catch { /* без памяти просто перезагрузим */ }
      if (tried === m[1]) return; // уже перезагружались на эту версию — не зацикливаемся
      try { sessionStorage.setItem("infoptk-reloaded", m[1]); } catch { /* ничего */ }
      // Параметры адреса (например, vk_app_id от ВКонтакте) сохраняем, меняем только v
      const params = new URLSearchParams(location.search);
      params.set("v", m[1]);
      location.replace(location.pathname + "?" + params + location.hash);
    })
    .catch(() => { /* нет сети — работаем со старой версией */ });
})();

// ---------- Запуск ----------

function initTelegram() {
  tg = (window.Telegram && window.Telegram.WebApp) || null;
  inTelegram = Boolean(tg && tg.initData);
  if (!inTelegram) return;
  tg.ready();
  tg.expand();
  tg.setHeaderColor("#002FA7");
  tg.setBackgroundColor("#F2F4F8");
  // Чтобы приложение не закрывалось, когда листаешь длинный список вниз
  if (tg.isVersionAtLeast && tg.isVersionAtLeast("7.7") && tg.disableVerticalSwipes) tg.disableVerticalSwipes();
  tg.BackButton.onClick(goBack);
  document.body.classList.add("in-telegram");
}

// Открыто ли приложение из Telegram: он передаёт данные в адресе, а после перезагрузки — в sessionStorage
function launchedFromTelegram() {
  if (window.Telegram && window.Telegram.WebApp) return false; // скрипт уже есть
  if (/tgWebApp/.test(location.hash)) return true;
  try { return Boolean(sessionStorage.getItem("__telegram__initParams")); } catch { return false; }
}

// ВКонтакте открывает мини-приложение с параметрами в адресе: ?vk_app_id=...&vk_platform=...
const launchedFromVK = () => /(^\?|&)vk_app_id=/.test(location.search);

// Связь с ВКонтакте (VK Bridge, лежит у нас в vendor\). Без VKWebAppInit приложение в ВК висит на заставке
function initVK() {
  const bridge = window.vkBridge;
  inVK = Boolean(bridge);
  if (!inVK) return;
  bridge.send("VKWebAppInit").catch(() => { /* не ответил — приложение всё равно показано */ });
  // Синяя шапка и светлые значки в мобильном ВК; на компьютере метода нет — ошибку пропускаем
  bridge.send("VKWebAppSetViewSettings", { status_bar_style: "light", action_bar_color: "#002FA7" }).catch(() => {});
  // На компьютере ВК даёт окно высотой около 450px — просим повыше, чтобы было похоже на экран телефона
  if (/(^\?|&)vk_platform=desktop_web(&|$)/.test(location.search)) {
    bridge.send("VKWebAppResizeWindow", { width: 795, height: 760 }).catch(() => {});
  }
  document.body.classList.add("in-vk");
}

// Скрипт грузим, только если он нужен. Если сервер не ответит за 5 секунд, запускаемся без него
function loadScript(src) {
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = resolve;
    setTimeout(resolve, 5000);
    document.head.appendChild(s);
  });
}

function boot() {
  initTelegram();
  initVK();
  renderHome();
  renderSafety();
  renderRules();
  renderPeople();
  renderNearby();
  updateBack();
  const startView = location.hash.slice(1);
  if (VIEWS.includes(startView)) showView(startView);
}

const platformScript = launchedFromTelegram() ? loadScript("https://telegram.org/js/telegram-web-app.js")
  : launchedFromVK() ? loadScript("vendor/vk-bridge.min.js")
  : Promise.resolve();
platformScript.then(boot);

// Работа без интернета: только на настоящем сайте (https), не в файле и не на странице claude.ai
if ("serviceWorker" in navigator && location.protocol === "https:" && /github\.io$/.test(location.hostname)) {
  navigator.serviceWorker.register("sw.js").catch(() => { /* не получилось — работаем как обычно */ });
}
