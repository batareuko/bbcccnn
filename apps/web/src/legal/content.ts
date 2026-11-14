/**
 * Legal document templates (UA / EN). Placeholders in {curly} braces are filled from env in ./vars.ts.
 * ⚠️ These are templates, not legal advice — have a lawyer review them before going live.
 */
import type { Locale } from "@/i18n/dict";

export type LegalDocId = "terms" | "privacy" | "refund" | "data-deletion";
export const LEGAL_DOCS: LegalDocId[] = ["terms", "privacy", "refund", "data-deletion"];

type Section = { h: string; p: string[] };
type Doc = { title: string; intro?: string; sections: Section[] };

const uk: Record<LegalDocId, Doc> = {
  terms: {
    title: "Публічна оферта та умови використання",
    intro:
      "Цей документ є публічною офертою (ст. 633, 641 Цивільного кодексу України) {legalName} (РНОКПП {taxId}, далі — «Виконавець») укласти договір про надання доступу до сервісу {brand} на умовах нижче. Реєстрація в сервісі або оплата означає повне й беззастережне прийняття цієї оферти (акцепт).",
    sections: [
      {
        h: "1. Предмет договору",
        p: [
          "Виконавець надає Користувачеві доступ до онлайн-сервісу {brand} за адресою {site} (далі — «Сервіс») для планування та публікації контенту в соціальних мережах, автопостингу з вебсайтів і RSS, а також AI-функцій (рерайт текстів, генерація контент-плану).",
          "Сервіс надається за моделлю «як є» (SaaS) через інтернет. Виконавець не є власником соціальних мереж і не відповідає за їхні правила, зміни API, обмеження чи блокування акаунтів Користувача.",
        ],
      },
      {
        h: "2. Реєстрація та акаунт",
        p: [
          "Для використання Сервісу Користувач створює акаунт, вказуючи достовірну електронну пошту. Користувач відповідає за збереження пароля та за всі дії, вчинені з його акаунта.",
          "Користувач підключає власні акаунти соціальних мереж і підтверджує, що має право публікувати від їхнього імені.",
        ],
      },
      {
        h: "3. Пробний період",
        p: [
          "Після реєстрації Користувач отримує безкоштовний пробний період тривалістю {trialDays} днів із можливостями тарифу Pro та {aiTrialCredits} AI-кредитами. Пробний період не продовжується автоматично в платну підписку і не потребує картки.",
          "Після завершення пробного періоду без оплати дані зберігаються, але планування та публікація призупиняються до вибору тарифу.",
        ],
      },
      {
        h: "4. Тарифи, оплата та автоматичне продовження",
        p: [
          "Актуальні тарифи (Starter, Pro, Agency) та ціни опубліковано на сторінці {site}/#pricing. Оплата здійснюється помісячно або щорічно наперед.",
          "Платежі в гривнях приймаються через платіжний сервіс WayForPay; міжнародні платежі — через Paddle.com Market Limited, який діє як продавець (Merchant of Record) і самостійно обробляє податки на споживання (VAT/sales tax).",
          "Підписка ПРОДОВЖУЄТЬСЯ АВТОМАТИЧНО на наступний період того ж тривалості з повторним списанням коштів з картки Користувача, доки Користувач її не скасує. Перед оплатою Користувач окремо підтверджує згоду на автоматичне продовження.",
          "Користувач може в будь-який момент вимкнути автопродовження на сторінці «Тарифи» в Сервісі. Доступ зберігається до кінця вже оплаченого періоду; наступні списання не здійснюються.",
          "Якщо автоматичне списання не вдалося, Виконавець може зберегти доступ ще до {graceDays} днів, протягом яких платіжна система повторює спробу.",
          "Виконавець може змінювати ціни, повідомивши Користувача не пізніше ніж за 14 днів; нові ціни застосовуються з наступного періоду оплати.",
        ],
      },
      {
        h: "5. AI-кредити",
        p: [
          "AI-функції оплачуються окремо від тарифу за допомогою AI-кредитів: 1 рерайт — 1 кредит; AI контент-план — 1 кредит за кожен згенерований пост. Якщо AI-запит не виконано через технічну помилку, кредити повертаються автоматично.",
          "Придбані кредити не мають строку дії. AI-результати генеруються автоматично й можуть містити неточності — Користувач перевіряє тексти перед публікацією і несе відповідальність за опублікований контент.",
        ],
      },
      {
        h: "6. Права та обов'язки Користувача",
        p: [
          "Користувач зобов'язується не використовувати Сервіс для спаму, поширення незаконного контенту, порушення авторських прав, дезінформації, шахрайства, а також для дій, що порушують правила соціальних мереж.",
          "Виконавець має право призупинити або припинити доступ у разі порушення цих умов, зокрема без повернення коштів за поточний період у разі грубого порушення.",
        ],
      },
      {
        h: "7. Інтелектуальна власність",
        p: [
          "Права на Сервіс належать Виконавцю. Увесь контент, який створює чи завантажує Користувач, належить Користувачеві; Виконавець використовує його лише для надання послуг.",
        ],
      },
      {
        h: "8. Відповідальність",
        p: [
          "Виконавець докладає розумних зусиль для безперервної роботи Сервісу, але не гарантує її відсутності перерв. Сукупна відповідальність Виконавця обмежується сумою, сплаченою Користувачем за останні 3 місяці.",
          "Виконавець не відповідає за дії соціальних мереж (обмеження API, видалення публікацій, блокування акаунтів) і за збитки, спричинені контентом Користувача.",
        ],
      },
      {
        h: "9. Повернення коштів",
        p: ["Умови повернення коштів визначені в Політиці повернення коштів: {site}/legal/refund."],
      },
      {
        h: "10. Персональні дані",
        p: ["Обробка персональних даних здійснюється відповідно до Політики конфіденційності: {site}/legal/privacy."],
      },
      {
        h: "11. Строк дії та припинення",
        p: [
          "Договір діє до видалення акаунта Користувачем або припинення доступу Виконавцем. Користувач може видалити акаунт у налаштуваннях Сервісу.",
          "Спори вирішуються шляхом переговорів, а в разі недосягнення згоди — відповідно до законодавства України.",
        ],
      },
      {
        h: "12. Реквізити Виконавця",
        p: ["{legalName}, РНОКПП {taxId}", "Адреса: {address}", "Email: {email}", "Телефон: {phone}"],
      },
    ],
  },
  privacy: {
    title: "Політика конфіденційності",
    intro:
      "Ця політика пояснює, які дані збирає {brand} ({site}), навіщо і як ми їх захищаємо. Володілець персональних даних — {legalName} (РНОКПП {taxId}). Ми діємо відповідно до Закону України «Про захист персональних даних» та, щодо користувачів з ЄС, Загального регламенту ЄС про захист даних (GDPR).",
    sections: [
      {
        h: "1. Які дані ми збираємо",
        p: [
          "Дані акаунта: електронна пошта, ім'я (за бажанням), хеш пароля, часовий пояс і мова.",
          "Контент: тексти постів, посилання на зображення, налаштування каналів і джерел автопостингу.",
          "Токени доступу до підключених соцмереж (Telegram, Facebook, Instagram тощо) — лише в обсязі, потрібному для публікації.",
          "Дані про оплату: тариф, суми, статус і дати платежів. Дані платіжних карток ми НЕ отримуємо й не зберігаємо — їх обробляють WayForPay або Paddle.",
          "Технічні дані: IP-адреса, тип браузера, журнали помилок — для безпеки та підтримки роботи Сервісу.",
        ],
      },
      {
        h: "2. Навіщо ми обробляємо дані",
        p: [
          "Надання Сервісу (виконання договору): створення акаунта, планування та публікація постів, AI-функції, обробка оплат.",
          "Законні інтереси: безпека, запобігання зловживанням, покращення Сервісу.",
          "Виконання вимог закону: бухгалтерський і податковий облік.",
          "Ми не продаємо персональні дані і не використовуємо контент Користувачів для навчання власних AI-моделей.",
        ],
      },
      {
        h: "3. Кому ми передаємо дані (обробники)",
        p: [
          "Хостинг і бази даних — для зберігання даних Сервісу.",
          "WayForPay (Україна) та Paddle.com Market Limited (Велика Британія) — для обробки платежів.",
          "Постачальники AI (Google — Gemini, DeepSeek, Anthropic — залежно від налаштувань Сервісу) — отримують лише текст, який Користувач надсилає на рерайт чи для контент-плану. Частина постачальників може обробляти дані за межами України та ЄС (зокрема в США та КНР).",
          "Соціальні мережі (Telegram, Meta тощо) — отримують контент, який Користувач доручив опублікувати.",
          "Передача даних за кордон здійснюється з дотриманням вимог законодавства, зокрема на підставі стандартних договірних положень, де це застосовно.",
        ],
      },
      {
        h: "4. Зберігання та захист",
        p: [
          "Дані зберігаються, поки існує акаунт. Після видалення акаунта ми видаляємо дані протягом 30 днів, окрім записів про платежі, які зберігаються стільки, скільки вимагає податкове законодавство.",
          "Паролі зберігаються лише у вигляді хешу; доступ до даних обмежено; з'єднання захищено HTTPS.",
        ],
      },
      {
        h: "5. Файли cookie",
        p: [
          "Ми використовуємо лише необхідні cookie: для входу в акаунт (сесія) і запам'ятовування мови. Рекламні та трекінгові cookie в Сервісі не використовуються.",
        ],
      },
      {
        h: "6. Ваші права",
        p: [
          "Ви маєте право отримати доступ до своїх даних, виправити їх, видалити, обмежити обробку, заперечити проти обробки, отримати копію даних (перенесення), а також подати скаргу до Уповноваженого Верховної Ради України з прав людини або до наглядового органу країни ЄС.",
          "Щоб скористатися правами, напишіть на {email}. Видалити акаунт і всі дані можна самостійно — див. {site}/legal/data-deletion.",
        ],
      },
      {
        h: "7. Діти",
        p: ["Сервіс не призначений для осіб молодше 16 років."],
      },
      {
        h: "8. Зміни політики",
        p: ["Про суттєві зміни ми повідомимо електронною поштою або в Сервісі не пізніше ніж за 14 днів."],
      },
      {
        h: "9. Контакти",
        p: ["{legalName}, {address}", "Email: {email}"],
      },
    ],
  },
  refund: {
    title: "Політика повернення коштів",
    sections: [
      {
        h: "1. Перша оплата підписки — 14 днів",
        p: [
          "Якщо Сервіс вам не підійшов, ви можете повернути кошти за першу оплату будь-якого тарифу протягом 14 днів від дати оплати — без пояснення причин. Напишіть на {email} з email акаунта.",
        ],
      },
      {
        h: "2. Автоматичні продовження",
        p: [
          "Кошти за автоматичне продовження підписки повертаються, якщо ви звернулися протягом 7 днів після списання і не публікували контент через Сервіс у новому періоді.",
          "Щоб уникнути майбутніх списань, вимкніть автопродовження на сторінці «Тарифи» — доступ збережеться до кінця оплаченого періоду.",
        ],
      },
      {
        h: "3. AI-кредити",
        p: [
          "Невикористані AI-кредити можна повернути протягом 14 днів після покупки. Використані кредити не повертаються. Кредити за невдалі AI-запити повертаються на баланс автоматично.",
        ],
      },
      {
        h: "4. Як відбувається повернення",
        p: [
          "Кошти повертаються на ту ж картку протягом 5–10 банківських днів. Платежі через Paddle повертаються відповідно до правил Paddle як продавця (Merchant of Record).",
          "Ми можемо відмовити в поверненні у разі порушення Умов використання або зловживання політикою повернень.",
        ],
      },
    ],
  },
  "data-deletion": {
    title: "Видалення даних",
    intro: "Ви можете будь-коли видалити свій акаунт {brand} разом з усіма даними.",
    sections: [
      {
        h: "Спосіб 1 — самостійно в Сервісі",
        p: [
          "Увійдіть у {site}/app/settings → розділ «Акаунт» → «Видалити акаунт» і підтвердіть дію. Будуть видалені: акаунт, робочі простори, де ви єдиний власник, пости, підключені канали та їхні токени доступу, джерела автопостингу.",
          "Якщо є активна підписка, спершу вимкніть автопродовження на сторінці «Тарифи».",
        ],
      },
      {
        h: "Спосіб 2 — за запитом",
        p: ["Напишіть на {email} з адреси, на яку зареєстровано акаунт. Ми видалимо дані протягом 30 днів і підтвердимо це листом."],
      },
      {
        h: "Facebook, Instagram та інші соцмережі",
        p: [
          "Щоб відкликати доступ {brand} до акаунта соцмережі, видаліть канал у розділі «Канали» або приберіть застосунок у налаштуваннях безпеки соцмережі (для Facebook: Налаштування → Бізнес-інтеграції / Програми та сайти). Після цього збережені токени доступу стають недійсними й видаляються.",
        ],
      },
      {
        h: "Що зберігається після видалення",
        p: ["Записи про платежі зберігаються стільки, скільки вимагає податкове законодавство України."],
      },
    ],
  },
};

const en: Record<LegalDocId, Doc> = {
  terms: {
    title: "Terms of Service",
    intro:
      "These Terms are a public offer by {legalName} (tax ID {taxId}, the “Provider”) to provide access to the {brand} service. By signing up or paying you accept these Terms in full.",
    sections: [
      {
        h: "1. The Service",
        p: [
          "The Provider gives you access to the {brand} online service at {site} (the “Service”) for planning and publishing social media content, auto-posting from websites and RSS, and AI features (text rewriting, content plan generation).",
          "The Service is provided “as is” as software-as-a-service. The Provider does not own the social networks and is not responsible for their rules, API changes, limits or suspension of your accounts.",
        ],
      },
      {
        h: "2. Account",
        p: [
          "You create an account with a valid email address and are responsible for keeping your password safe and for all activity under your account.",
          "You connect your own social media accounts and confirm you are authorised to publish on their behalf.",
        ],
      },
      {
        h: "3. Free trial",
        p: [
          "New accounts get a {trialDays}-day free trial with Pro features and {aiTrialCredits} AI credits. The trial does not turn into a paid subscription automatically and needs no card.",
          "If you don't pick a plan after the trial, your data is kept but scheduling and publishing are paused.",
        ],
      },
      {
        h: "4. Plans, payment and automatic renewal",
        p: [
          "Current plans (Starter, Pro, Agency) and prices are listed at {site}/en#pricing. Subscriptions are paid monthly or yearly in advance.",
          "UAH payments are processed by WayForPay. International payments are processed by Paddle.com Market Limited, which acts as the Merchant of Record and handles sales tax / VAT.",
          "YOUR SUBSCRIPTION RENEWS AUTOMATICALLY for the same period and your card is charged again until you cancel. You explicitly agree to automatic renewal before paying.",
          "You can turn off auto-renewal at any time on the Billing page. You keep access until the end of the paid period and won't be charged again.",
          "If a renewal charge fails, the Provider may keep your access for up to {graceDays} days while the payment is retried.",
          "The Provider may change prices with at least 14 days' notice; new prices apply from your next billing period.",
        ],
      },
      {
        h: "5. AI credits",
        p: [
          "AI features are billed separately with AI credits: 1 rewrite = 1 credit; AI content plan = 1 credit per generated post. Credits for AI requests that fail for technical reasons are refunded automatically.",
          "Purchased credits do not expire. AI output is generated automatically and may contain mistakes — you review texts before publishing and are responsible for what you publish.",
        ],
      },
      {
        h: "6. Acceptable use",
        p: [
          "You must not use the Service for spam, illegal content, copyright infringement, disinformation, fraud, or anything that violates the rules of the social networks.",
          "The Provider may suspend or terminate access for violations, without refund for the current period in case of serious abuse.",
        ],
      },
      {
        h: "7. Intellectual property",
        p: ["The Service belongs to the Provider. Content you create or upload remains yours; the Provider uses it only to provide the Service."],
      },
      {
        h: "8. Liability",
        p: [
          "The Provider makes reasonable efforts to keep the Service available but does not guarantee uninterrupted operation. The Provider's total liability is limited to the amount you paid in the last 3 months.",
          "The Provider is not liable for actions of social networks (API limits, removed posts, account bans) or for damage caused by your content.",
        ],
      },
      { h: "9. Refunds", p: ["See the Refund Policy: {site}/en/legal/refund."] },
      { h: "10. Personal data", p: ["See the Privacy Policy: {site}/en/legal/privacy."] },
      {
        h: "11. Term and termination",
        p: [
          "These Terms apply until you delete your account or the Provider terminates access. You can delete your account in Settings.",
          "Disputes are resolved by negotiation and otherwise under the laws of Ukraine, without prejudice to mandatory consumer protection rights in your country.",
        ],
      },
      {
        h: "12. Provider details",
        p: ["{legalName}, tax ID {taxId}", "Address: {address}", "Email: {email}", "Phone: {phone}"],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    intro:
      "This policy explains what data {brand} ({site}) collects, why, and how we protect it. The data controller is {legalName} (tax ID {taxId}). We comply with the Law of Ukraine “On Personal Data Protection” and, for users in the EU/EEA/UK, the GDPR.",
    sections: [
      {
        h: "1. Data we collect",
        p: [
          "Account data: email, name (optional), password hash, time zone and language.",
          "Content: post texts, image links, channel and auto-posting settings.",
          "Access tokens for connected social networks (Telegram, Facebook, Instagram, etc.), limited to what's needed to publish.",
          "Billing data: plan, amounts, payment status and dates. We do NOT receive or store card details — WayForPay or Paddle process them.",
          "Technical data: IP address, browser type, error logs — for security and operating the Service.",
        ],
      },
      {
        h: "2. Why we process it (legal bases)",
        p: [
          "To provide the Service (contract): account, scheduling and publishing, AI features, payments.",
          "Legitimate interests: security, abuse prevention, improving the Service.",
          "Legal obligations: accounting and tax records.",
          "We do not sell personal data and do not use your content to train our own AI models.",
        ],
      },
      {
        h: "3. Processors we share data with",
        p: [
          "Hosting and database providers — to store Service data.",
          "WayForPay (Ukraine) and Paddle.com Market Limited (UK) — payment processing.",
          "AI providers (Google — Gemini, DeepSeek, Anthropic — depending on Service configuration) receive only the text you submit for rewriting or content planning. Some providers may process data outside Ukraine and the EU (including the USA and China).",
          "Social networks (Telegram, Meta, etc.) receive the content you ask us to publish.",
          "International transfers rely on appropriate safeguards such as Standard Contractual Clauses where applicable.",
        ],
      },
      {
        h: "4. Retention and security",
        p: [
          "We keep data while your account exists and delete it within 30 days after account deletion, except payment records kept as required by tax law.",
          "Passwords are stored only as hashes, access to data is restricted, and connections use HTTPS.",
        ],
      },
      {
        h: "5. Cookies",
        p: ["We use only strictly necessary cookies: your login session and language preference. No advertising or tracking cookies are used in the Service."],
      },
      {
        h: "6. Your rights",
        p: [
          "You can access, correct, delete, restrict or object to processing of your data, receive a copy (portability), and complain to a supervisory authority.",
          "Email {email} to exercise your rights. You can delete your account and all data yourself — see {site}/en/legal/data-deletion.",
        ],
      },
      { h: "7. Children", p: ["The Service is not intended for anyone under 16."] },
      { h: "8. Changes", p: ["We'll notify you of material changes by email or in the Service at least 14 days in advance."] },
      { h: "9. Contact", p: ["{legalName}, {address}", "Email: {email}"] },
    ],
  },
  refund: {
    title: "Refund Policy",
    sections: [
      {
        h: "1. First subscription payment — 14 days",
        p: ["If the Service isn't right for you, you can get a refund for your first payment on any plan within 14 days of payment, no questions asked. Email {email} from your account email."],
      },
      {
        h: "2. Automatic renewals",
        p: [
          "Renewal charges are refunded if you contact us within 7 days of the charge and haven't published content through the Service in the new period.",
          "To avoid future charges, turn off auto-renewal on the Billing page — you keep access until the end of the paid period.",
        ],
      },
      {
        h: "3. AI credits",
        p: ["Unused AI credits can be refunded within 14 days of purchase. Used credits are non-refundable. Credits for failed AI requests are returned to your balance automatically."],
      },
      {
        h: "4. How refunds work",
        p: [
          "Refunds go back to the original card within 5–10 business days. Payments made through Paddle are refunded under Paddle's rules as Merchant of Record.",
          "We may refuse refunds for violations of the Terms or abuse of this policy.",
        ],
      },
    ],
  },
  "data-deletion": {
    title: "Data Deletion",
    intro: "You can delete your {brand} account and all associated data at any time.",
    sections: [
      {
        h: "Option 1 — yourself, in the Service",
        p: [
          "Sign in at {site}/app/settings → “Account” → “Delete account” and confirm. This deletes your account, workspaces where you are the only owner, posts, connected channels and their access tokens, and auto-posting sources.",
          "If you have an active subscription, turn off auto-renewal on the Billing page first.",
        ],
      },
      {
        h: "Option 2 — by request",
        p: ["Email {email} from your account email address. We'll delete your data within 30 days and confirm by email."],
      },
      {
        h: "Facebook, Instagram and other networks",
        p: [
          "To revoke {brand}'s access to a social account, remove the channel on the Channels page or remove the app in the network's security settings (Facebook: Settings → Business integrations / Apps and websites). Stored access tokens then become invalid and are deleted.",
        ],
      },
      {
        h: "What we keep",
        p: ["Payment records are kept for as long as Ukrainian tax law requires."],
      },
    ],
  },
};

export const LEGAL: Record<Locale, Record<LegalDocId, Doc>> = { uk, en };
