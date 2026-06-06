// ============================================================
//  main.js — DOSYA NO.7 | Final Sürüm (Hata Ayıklanmış)
// ============================================================

const SAVE_KEY = "dosya7_save";

// --- İSİM HAVUZLARI ---
const FIRST_NAMES = [
  "Arthur", "Elena", "Viktor", "Nora", "Marcus",
  "Selin", "Dorian", "Iris", "Conrad", "Leyla"
];
const LAST_NAMES = [
  "Voss", "Cross", "Marsh", "Hartmann", "Crane",
  "Yildiz", "Blackwell", "Adler", "Stone", "Demir"
];

// Oyuna girilen anda vaka sayacı artan event id'leri
// (bu event'e ULAŞILDIĞINDA sayılır, buradan çıkılırken değil)
const CASE_COMPLETE_IDS = new Set(["case01_confront", "case02_solved", "case03_solved"]);

// Daha önce hangi vaka tamamlanma event'leri ziyaret edildi
// (aynı event'e tekrar girilince çifte sayım olmasın)
let visitedCaseEvents = new Set();

// --- VARSAYILAN GAME STATE ---
const DEFAULT_STATE = () => ({
  currentEventId:    "start",
  isim:              "Arthur Voss",
  yas:               25,
  kalp:              5,
  successCount:      0,
  totalTurns:        0,
  casesResolved:     0,
  visitedCaseEvents: [],   // JSON serileştirme için array olarak sakla
  stats: {
    zeka:      5,
    guc:       5,
    itibar:    5,
    psikoloji: 5
  }
});

let gameState  = DEFAULT_STATE();
let eventsData = [];

// Toast zamanlayıcısı
let toastTimer = null;

// Oyunun başlatılıp başlatılmadığı (resetGame güvenliği için)
let gameStarted = false;

// ============================================================
//  SAVE / LOAD / RESET
// ============================================================
function saveGame() {
  try {
    // visitedCaseEvents Set'ini array'e çevirerek kaydet
    const stateToSave = {
      ...gameState,
      visitedCaseEvents: [...visitedCaseEvents]
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(stateToSave));
  } catch (e) {
    console.warn("Kayıt başarısız:", e);
  }
}

function loadGame() {
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (!saved) return false;

    const parsed = JSON.parse(saved);
    if (!parsed || !parsed.currentEventId || !parsed.stats) return false;

    // Eksik alanları varsayılanla doldur (eski kayıtlara uyumluluk)
    parsed.totalTurns        = parsed.totalTurns        ?? 0;
    parsed.casesResolved     = parsed.casesResolved     ?? 0;
    parsed.visitedCaseEvents = parsed.visitedCaseEvents ?? [];

    gameState          = parsed;
    visitedCaseEvents  = new Set(parsed.visitedCaseEvents);
    return true;
  } catch (e) {
    console.warn("Kayıt yüklenemedi:", e);
    return false;
  }
}

function resetGame() {
  if (!confirm("Tüm ilerleme silinecek. Emin misin?")) return;

  if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }

  localStorage.removeItem(SAVE_KEY);
  gameState         = DEFAULT_STATE();
  visitedCaseEvents = new Set();

  // Butonların disabled durumunu temizle
  document.getElementById("btn-choice-1").disabled = false;
  document.getElementById("btn-choice-2").disabled = false;

  // Açık modalı kapat
  const modal = document.getElementById("reincarnation-modal");
  modal.classList.remove("visible");
  modal.setAttribute("aria-hidden", "true");

  if (gameStarted) renderUI();
}

// ============================================================
//  YARDIMCI: rastgele isim
// ============================================================
function generateRandomName(excludeName) {
  let name;
  let attempts = 0;
  do {
    const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const last  = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    name = first + " " + last;
    attempts++;
  } while (name === excludeName && attempts < 20);
  return name;
}

// ============================================================
//  TOAST BİLDİRİMİ
// ============================================================
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  if (toastTimer) clearTimeout(toastTimer);

  toast.textContent = message;
  // Önce sınıfları temizle, sonra yenisini ekle (aynı mesaj tekrar animasyon alsın)
  toast.className = "";
  // Bir frame bekleyip yeni class'ı ekle (CSS geçişini yeniden tetikler)
  requestAnimationFrame(() => {
    toast.className = "toast toast-" + type + " toast-visible";
  });

  toastTimer = setTimeout(() => {
    toast.classList.remove("toast-visible");
    toastTimer = null;
  }, 2400);
}

// ============================================================
//  STAT DEĞİŞİM ANİMASYONU
// ============================================================
function animateStatChange(statId, delta) {
  const el = document.getElementById("stat-" + statId);
  if (!el || delta === 0) return;
  el.classList.remove("stat-up", "stat-down");
  void el.offsetWidth; // reflow — animasyonu yeniden başlatır
  el.classList.add(delta > 0 ? "stat-up" : "stat-down");
  setTimeout(() => el.classList.remove("stat-up", "stat-down"), 700);
}

// ============================================================
//  ÖLÜM KONTROLÜ
// ============================================================
function checkDeathCondition() {
  if (gameState.kalp <= 0 || gameState.yas >= 80) {
    triggerReincarnation();
    return true;
  }
  return false;
}

// ============================================================
//  REENKARNASYOn
// ============================================================
function triggerReincarnation() {
  const oldName     = gameState.isim;
  const deathReason = gameState.kalp <= 0
    ? "Kalpleri tükendi."
    : "Ömrünü tamamladı.";

  const newName = generateRandomName(oldName);

  // Önceki statların %60'ı, minimum 3
  const inheritedStats = {};
  for (const [stat, val] of Object.entries(gameState.stats)) {
    inheritedStats[stat] = Math.max(3, Math.floor(val * 0.6));
  }

  // Korunan sayaçlar
  const prevCases = gameState.casesResolved;
  const prevTurns = gameState.totalTurns;

  gameState = DEFAULT_STATE();
  gameState.isim          = newName;
  gameState.yas           = Math.floor(Math.random() * 11) + 20; // 20–30
  gameState.casesResolved = prevCases;
  gameState.totalTurns    = prevTurns;
  gameState.stats         = inheritedStats;
  // currentEventId: kaldığı yerden devam (DEFAULT_STATE "start" yapıyor,
  // ancak burada zaten rescue/fail sonrası bir noktadayız; ölümden önce
  // currentEventId güncellendi, onu koruyoruz:)
  // NOT: gameState.currentEventId DEFAULT'ta "start" — ölüm sonrası "start"tan
  // devam etmek anlamlıdır (yeni dedektif yeni bir dosya açar).

  // visitedCaseEvents sıfırla (yeni dedektif temiz başlar ama case sayacı korunur)
  visitedCaseEvents = new Set();

  saveGame();

  // Modalı doldur ve göster
  document.getElementById("modal-title").textContent = "Bir Dönem Kapandı";
  document.getElementById("modal-body").innerHTML =
    `Dedektif <strong>${oldName}</strong> hayatını kaybetti.<br/>${deathReason}<br/><br/>` +
    `Dosyayı artık Dedektif <strong>${newName}</strong> devralıyor...`;

  document.getElementById("modal-legacy").innerHTML =
    `<span class="legacy-label">Miras Statlar</span>` +
    `<span>🧠 ${inheritedStats.zeka}</span>` +
    `<span>💪 ${inheritedStats.guc}</span>` +
    `<span>⭐ ${inheritedStats.itibar}</span>` +
    `<span>🧘 ${inheritedStats.psikoloji}</span>`;

  const modal = document.getElementById("reincarnation-modal");
  modal.classList.add("visible");
  modal.setAttribute("aria-hidden", "false");
}

// ============================================================
//  initGame()
// ============================================================
async function initGame() {
  try {
    const response = await fetch("events.json");
    if (!response.ok) throw new Error("events.json yüklenemedi.");
    eventsData = await response.json();

    const loaded = loadGame();
    if (!loaded) {
      gameState         = DEFAULT_STATE();
      visitedCaseEvents = new Set();
    }

    setupIntroScreen(loaded);
    bindButtons();
    bindModal();
    bindReset();
  } catch (err) {
    console.error("Oyun başlatılamadı:", err);
    // Hata ekranda göster (game-area'yı göster, story-text'e yaz)
    document.getElementById("intro-screen").classList.add("hidden");
    document.getElementById("game-area").classList.remove("hidden");
    document.getElementById("story-text").textContent =
      "Oyun yüklenirken bir hata oluştu. Sayfayı yenileyin.";
  }
}

// ============================================================
//  INTRO EKRANI
// ============================================================
function setupIntroScreen(hasSave) {
  const hint = document.getElementById("intro-hint");
  if (hasSave && hint) {
    hint.textContent =
      `Ded. ${gameState.isim} · Yaş ${gameState.yas} · ${gameState.casesResolved} dava çözüldü`;
  }

  const startBtn = document.getElementById("intro-start-btn");
  if (!startBtn) return;

  startBtn.addEventListener("click", () => {
    const intro = document.getElementById("intro-screen");
    const game  = document.getElementById("game-area");

    intro.classList.add("intro-fade-out");

    setTimeout(() => {
      intro.classList.add("hidden");
      game.classList.remove("hidden");
      game.classList.add("game-fade-in");
      gameStarted = true;
      renderUI();
    }, 500);
  });
}

// ============================================================
//  EVENT LİSTENER'LAR
// ============================================================
function bindButtons() {
  document.getElementById("btn-choice-1")
    .addEventListener("click", () => handleChoice(0));
  document.getElementById("btn-choice-2")
    .addEventListener("click", () => handleChoice(1));
}

function bindModal() {
  document.getElementById("modal-continue-btn")
    .addEventListener("click", () => {
      const modal = document.getElementById("reincarnation-modal");
      modal.classList.remove("visible");
      modal.setAttribute("aria-hidden", "true");

      // Butonları her ihtimale karşı etkinleştir
      document.getElementById("btn-choice-1").disabled = false;
      document.getElementById("btn-choice-2").disabled = false;

      renderUI();
    });
}

function bindReset() {
  document.getElementById("reset-btn")
    .addEventListener("click", resetGame);
}

// ============================================================
//  REQUIREMENTS KONTROLÜ — saf deterministik, şans = 0
// ============================================================
function checkRequirements(requirements) {
  for (const [stat, minValue] of Object.entries(requirements)) {
    if ((gameState.stats[stat] ?? 0) < minValue) return false;
  }
  return true;
}

// ============================================================
//  SEÇIM MANTIĞI
// ============================================================
function handleChoice(choiceIndex) {
  const currentEvent = eventsData.find(e => e.id === gameState.currentEventId);
  if (!currentEvent) return;

  const btn1 = document.getElementById("btn-choice-1");
  const btn2 = document.getElementById("btn-choice-2");

  // Çift tık koruması
  btn1.disabled = true;
  btn2.disabled = true;

  const choice    = currentEvent.choices[choiceIndex];
  const isSuccess = checkRequirements(choice.requirements);

  gameState.totalTurns += 1;

  if (isSuccess) {
    // ---- BAŞARILI ----
    const changedStats = [];

    for (const [stat, delta] of Object.entries(choice.statChanges)) {
      if (gameState.stats[stat] !== undefined && delta !== 0) {
        gameState.stats[stat] = Math.max(0, gameState.stats[stat] + delta);
        animateStatChange(stat, delta);
        changedStats.push((delta > 0 ? "+" : "") + delta + " " + statLabel(stat));
      }
    }

    if (changedStats.length > 0) {
      showToast(changedStats.join("  ·  "), "success");
    }

    // Yaş mekanizması: her 3 başarılı hamlede +1 yaş
    gameState.successCount += 1;
    if (gameState.successCount % 3 === 0) {
      gameState.yas += 1;
    }

    gameState.currentEventId = choice.successNext;

    // Vaka tamamlanma: hedef event bir tamamlanma node'uysa ve
    // daha önce sayılmamışsa sayacı artır
    if (
      CASE_COMPLETE_IDS.has(choice.successNext) &&
      !visitedCaseEvents.has(choice.successNext)
    ) {
      gameState.casesResolved += 1;
      visitedCaseEvents.add(choice.successNext);
    }

  } else {
    // ---- BAŞARISIZ ----
    // Animasyon için kalp düşmeden ÖNCE hangi kalbin kaybolacağını belirle
    const dyingHeartIndex = gameState.kalp; // 1-indexed, düşecek olan budur
    gameState.kalp        = Math.max(0, gameState.kalp - 1);
    gameState.currentEventId = choice.failNext;

    // Animasyonu düşmüş kalbe uygula (artık lost sınıfını alacak)
    triggerFailFeedback(choiceIndex, dyingHeartIndex);
    showToast("Yetersiz stat — bir kalp kaybedildi.", "danger");
  }

  saveGame();

  const isDead = checkDeathCondition();

  if (isDead) {
    // Modal açık; butonlar modaldan "Devam Et"e basılınca tekrar açılır
    // (bindModal içinde yapılıyor)
  } else {
    // Butonları fade bitmeden biraz sonra etkinleştir
    setTimeout(() => {
      btn1.disabled = false;
      btn2.disabled = false;
    }, 260); // renderUI'daki 220ms fade + biraz buffer
    renderUI();
  }
}

// ============================================================
//  BAŞARISIZLIK ANİMASYONU
// ============================================================
function triggerFailFeedback(choiceIndex, dyingHeartIndex) {
  const btnId = choiceIndex === 0 ? "btn-choice-1" : "btn-choice-2";
  const btn   = document.getElementById(btnId);
  const story = document.querySelector(".story-container");

  // Butonu kırmızı yap — disabled çakışmasını önlemek için animasyon süresi
  // içinde disabled'ı kaldırmıyoruz; sadece görsel class ekliyoruz
  btn.classList.add("btn-fail");
  setTimeout(() => btn.classList.remove("btn-fail"), 600);

  // Ekran sarsıntısı
  story.classList.add("shake");
  setTimeout(() => story.classList.remove("shake"), 450);

  // Kaybedilen kalbi animasyonla vurgula
  const heartEl = document.getElementById("heart-" + dyingHeartIndex);
  if (heartEl) {
    heartEl.classList.add("heart-damage");
    setTimeout(() => heartEl.classList.remove("heart-damage"), 820);
  }
}

// ============================================================
//  RENDER UI — fade geçişiyle
// ============================================================
function renderUI() {
  // Üst bar — anında güncelle
  document.getElementById("char-name").textContent   = "Ded. " + gameState.isim;
  document.getElementById("char-age").textContent    = "Yaş: " + gameState.yas;
  document.getElementById("char-cases").textContent  = "Dava: " + gameState.casesResolved;
  document.getElementById("char-turns").textContent  = "Tur: "  + gameState.totalTurns;

  // Kalpler
  for (let i = 1; i <= 5; i++) {
    document.getElementById("heart-" + i)
      .classList.toggle("lost", i > gameState.kalp);
  }

  // Statlar
  document.getElementById("stat-zeka").textContent      = gameState.stats.zeka;
  document.getElementById("stat-guc").textContent       = gameState.stats.guc;
  document.getElementById("stat-itibar").textContent    = gameState.stats.itibar;
  document.getElementById("stat-psikoloji").textContent = gameState.stats.psikoloji;

  // Mevcut event
  const currentEvent = eventsData.find(e => e.id === gameState.currentEventId);
  if (!currentEvent) {
    console.warn("Event bulunamadı:", gameState.currentEventId);
    // Bilinmeyen event'e düşüldüyse başa dön
    gameState.currentEventId = "start";
    saveGame();
    renderUI();
    return;
  }

  // Fade OUT → güncelle → Fade IN
  const storyEl = document.getElementById("story-text");
  const btn1    = document.getElementById("btn-choice-1");
  const btn2    = document.getElementById("btn-choice-2");

  storyEl.classList.add("fade-out");
  btn1.classList.add("fade-out");
  btn2.classList.add("fade-out");

  setTimeout(() => {
    storyEl.textContent = currentEvent.text;
    btn1.textContent    = currentEvent.choices[0].buttonText;
    btn2.textContent    = currentEvent.choices[1].buttonText;

    updateButtonHints(currentEvent);

    storyEl.classList.remove("fade-out");
    btn1.classList.remove("fade-out");
    btn2.classList.remove("fade-out");
  }, 220);
}

// ============================================================
//  BUTON KİLİT İPUCU — KALDIRILDI
//  Her iki seçenek de aynı görünür; oyuncu hangi seçeneğin
//  risk taşıdığını bilemez. Deterministik ama görsel olarak nötr.
// ============================================================
function updateButtonHints(event) {
  // Tüm butonları nötr tut — locked class uygulanmaz
  document.getElementById("btn-choice-1").classList.remove("btn-locked");
  document.getElementById("btn-choice-2").classList.remove("btn-locked");
}

// ============================================================
//  YARDIMCI: stat key → Türkçe etiket
// ============================================================
function statLabel(key) {
  const map = {
    zeka:      "Zeka",
    guc:       "Güç",
    itibar:    "İtibar",
    psikoloji: "Psikoloji"
  };
  return map[key] || key;
}

// ============================================================
//  BAŞLAT
// ============================================================
document.addEventListener("DOMContentLoaded", initGame);
