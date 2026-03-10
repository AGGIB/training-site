export type Lang = "ru" | "kz";

type Dictionary = {
  appTitle: string;
  appSubtitle: string;
  login: string;
  register: string;
  username: string;
  password: string;
  authSubmit: string;
  logout: string;
  loading: string;
  modeVariant: string;
  modeMixed: string;
  variantLabel: string;
  startQuiz: string;
  finishQuiz: string;
  nextQuestion: string;
  timer: string;
  correct: string;
  incorrect: string;
  correctAnswer: string;
  dashboard: string;
  stats: string;
  totalAttempts: string;
  totalAnswered: string;
  accuracy: string;
  activeMistakes: string;
  mistakesWork: string;
  refreshMistakes: string;
  noMistakes: string;
  streak: string;
  answer: string;
  author: string;
  startMistakeSession: string;
  question: string;
  completed: string;
  history: string;
};

export const dictionaries: Record<Lang, Dictionary> = {
  ru: {
    appTitle: "Экзаменационный тренажёр",
    appSubtitle: "9 вариантов, статистика и работа над ошибками",
    login: "Вход",
    register: "Регистрация",
    username: "Имя",
    password: "Пароль",
    authSubmit: "Продолжить",
    logout: "Выйти",
    loading: "Загрузка...",
    modeVariant: "По варианту",
    modeMixed: "Смешанный",
    variantLabel: "Вариант",
    startQuiz: "Начать тест",
    finishQuiz: "Завершить тест",
    nextQuestion: "Следующий",
    timer: "Время",
    correct: "Верно",
    incorrect: "Неверно",
    correctAnswer: "Правильный ответ",
    dashboard: "Панель",
    stats: "Статистика",
    totalAttempts: "Попыток",
    totalAnswered: "Ответов",
    accuracy: "Точность",
    activeMistakes: "Активные ошибки",
    mistakesWork: "Работа над ошибками",
    refreshMistakes: "Обновить ошибки",
    noMistakes: "Ошибок в очереди нет",
    streak: "Серия",
    answer: "Ответить",
    author: "Автор: agybay",
    startMistakeSession: "Тренировать ошибки",
    question: "Вопрос",
    completed: "Завершено",
    history: "История попыток"
  },
  kz: {
    appTitle: "Емтихан тренажері",
    appSubtitle: "9 нұсқа, статистика және қателермен жұмыс",
    login: "Кіру",
    register: "Тіркелу",
    username: "Аты",
    password: "Құпиясөз",
    authSubmit: "Жалғастыру",
    logout: "Шығу",
    loading: "Жүктелуде...",
    modeVariant: "Нұсқа бойынша",
    modeMixed: "Аралас",
    variantLabel: "Нұсқа",
    startQuiz: "Тест бастау",
    finishQuiz: "Тестті аяқтау",
    nextQuestion: "Келесі",
    timer: "Уақыт",
    correct: "Дұрыс",
    incorrect: "Қате",
    correctAnswer: "Дұрыс жауап",
    dashboard: "Панель",
    stats: "Статистика",
    totalAttempts: "Әрекет саны",
    totalAnswered: "Жауап саны",
    accuracy: "Дәлдік",
    activeMistakes: "Белсенді қателер",
    mistakesWork: "Қателермен жұмыс",
    refreshMistakes: "Қателерді жаңарту",
    noMistakes: "Қателер кезегінде сұрақ жоқ",
    streak: "Серия",
    answer: "Жауап беру",
    author: "Автор: agybay",
    startMistakeSession: "Қателерді жаттықтыру",
    question: "Сұрақ",
    completed: "Аяқталды",
    history: "Әрекет тарихы"
  }
};
