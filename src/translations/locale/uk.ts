// Переклад на українську мову
const translations = {
	"Comprehensive task management plugin for Obsidian with progress bars, task status cycling, and advanced task tracking features.":
		"Комплексний додаток для керування завданнями в Obsidian із прогрес-барами, циклічною зміною статусу завдань та розширеними функціями відстеження.",
	"Show progress bar":
		"Показати прогрес-бар",
	"Toggle this to show the progress bar.":
		"Увімкніть, щоб показати прогрес-бар.",
	"Support hover to show progress info":
		"Показувати інформацію про прогрес при наведенні",
	"Toggle this to allow this plugin to show progress info when hovering over the progress bar.":
		"Увімкніть, щоб додаток показував інформацію про прогрес при наведенні на прогрес-бар.",
	"Add progress bar to non-task bullet":
		"Додати прогрес-бар до звичайних елементів списку",
	"Toggle this to allow adding progress bars to regular list items (non-task bullets).":
		"Увімкніть, щоб додати прогрес-бари до звичайних елементів списку (не завдань).",
	"Add progress bar to Heading":
		"Додати прогрес-бар до заголовків",
	"Toggle this to allow this plugin to add progress bar for Task below the headings.":
		"Увімкніть, щоб додаток додавав прогрес-бар для завдань під заголовками.",
	"Enable heading progress bars":
		"Увімкнути прогрес-бари для заголовків",
	"Add progress bars to headings to show progress of all tasks under that heading.":
		"Додайте прогрес-бари до заголовків, щоб показати прогрес усіх завдань під цим заголовком.",
	"Auto complete parent task":
		"Автоматично завершувати батьківське завдання",
	"Toggle this to allow this plugin to auto complete parent task when all child tasks are completed.":
		"Увімкніть, щоб додаток автоматично завершував батьківське завдання, коли всі дочірні завдання завершені.",
	"Mark parent as 'In Progress' when partially complete":
		"Позначати батьківське завдання як 'В процесі', якщо завершено частково",
	"When some but not all child tasks are completed, mark the parent task as 'In Progress'. Only works when 'Auto complete parent' is enabled.":
		"Якщо деякі, але не всі дочірні завдання завершені, позначити батьківське завдання як 'В процесі'. Працює лише при увімкненій опції 'Автоматично завершувати батьківське завдання'.",
	"Count sub children level of current Task":
		"Враховувати дочірні завдання поточного завдання",
	"Toggle this to allow this plugin to count sub tasks.":
		"Увімкніть, щоб додаток враховував дочірні завдання.",
	"Task Status Settings":
		"Налаштування статусу завдань",
	"Select a predefined task status collection or customize your own":
		"Оберіть попередньо визначений набір статусів завдань, або налаштуйте власний",
	"Completed task markers":
		"Маркери завершених завдань",
	'Characters in square brackets that represent completed tasks. Example: "x|X"':
		'Символи в квадратних дужках, що позначають завершені завдання. Приклад: "x|X"',
	"Planned task markers":
		"Маркери запланованих завдань",
	'Characters in square brackets that represent planned tasks. Example: "?"':
		'Символи в квадратних дужках, що позначають заплановані завдання. Приклад: "?"',
	"In progress task markers":
		"Маркери завдань у процесі",
	'Characters in square brackets that represent tasks in progress. Example: ">|/"':
		'Символи в квадратних дужках, що позначають завдання в процесі. Приклад: ">|/"',
	"Abandoned task markers":
		"Маркери покинутих завдань",
	'Characters in square brackets that represent abandoned tasks. Example: "-"':
		'Символи в квадратних дужках, що позначають покинуті завдання. Приклад: "-"',
	'Characters in square brackets that represent not started tasks. Default is space " "':
		'Символи в квадратних дужках, що позначають не розпочаті завдання. За замовчуванням — пробіл " "',
	"Count other statuses as":
		"Враховувати інші статуси як",
	'Select the status to count other statuses as. Default is "Not Started".':
		'Виберіть статус, у який переводити інші статуси. За замовчуванням — "Не розпочато".',
	"Task Counting Settings":
		"Налаштування підрахунку завдань",
	"Exclude specific task markers":
		"Виключити певні маркери завдань",
	'Specify task markers to exclude from counting. Example: "?|/"':
		'Вкажіть маркери завдань, які потрібно виключити з підрахунку. Приклад: "?|/"',
	"Only count specific task markers":
		"Враховувати лише певні маркери завдань",
	"Toggle this to only count specific task markers":
		"Увімкніть, щоб враховувати лише певні маркери завдань",
	"Specific task markers to count":
		"Певні маркери завдань для підрахунку",
	'Specify which task markers to count. Example: "x|X|>|/"':
		'Вкажіть, які маркери завдань враховувати. Приклад: "x|X|>|/"',
	"Conditional Progress Bar Display":
		"Умовне відображення прогрес-бару",
	"Hide progress bars based on conditions":
		"Приховувати прогрес-бари за умовами",
	"Toggle this to enable hiding progress bars based on tags, folders, or metadata.":
		"Увімкніть, щоб приховувати прогрес-бари на основі міток, папок, або метаданих.",
	"Hide by tags":
		"Приховувати за мітками",
	'Specify tags that will hide progress bars (comma-separated, without #). Example: "no-progress-bar,hide-progress"':
		'Вкажіть мітки, які приховуватимуть прогрес-бари (через кому, без #). Приклад: "no-progress-bar,hide-progress"',
	"Hide by folders":
		"Приховувати за папками",
	'Specify folder paths that will hide progress bars (comma-separated). Example: "Daily Notes,Projects/Hidden"':
		'Вкажіть шляхи до папок, які приховуватимуть прогрес-бари (через кому). Приклад: "Daily Notes,Projects/Hidden"',
	"Hide by metadata":
		"Приховувати за метаданими",
	'Specify frontmatter metadata that will hide progress bars. Example: "hide-progress-bar: true"':
		'Вкажіть метадані frontmatter, які приховуватимуть прогрес-бари. Приклад: "hide-progress-bar: true"',
	"Task Status Switcher":
		"Перемикач статусу завдань",
	"Enable task status switcher":
		"Увімкнути перемикач статусу завдань",
	"Enable/disable the ability to cycle through task states by clicking.":
		"Увімкнути/вимкнути можливість перемикання статусів завдань клацанням.",
	"Enable custom task marks":
		"Увімкнути користувацькі маркери завдань",
	"Replace default checkboxes with styled text marks that follow your task status cycle when clicked.":
		"Замініть стандартні прапорці на стилізовані текстові маркери, які слідують за вашим циклом статусів завдань при клацанні.",
	"Enable cycle complete status":
		"Увімкнути циклічне завершення статусу",
	"Enable/disable the ability to automatically cycle through task states when pressing a mark.":
		"Увімкнути/вимкнути автоматичне перемикання статусів завдань при натисканні на маркер.",
	"Always cycle new tasks":
		"Завжди перемикати нові завдання",
	"When enabled, newly inserted tasks will immediately cycle to the next status. When disabled, newly inserted tasks with valid marks will keep their original mark.":
		"Якщо увімкнено, нові завдання одразу перемикатимуться на наступний статус. Якщо вимкнено, нові завдання з дійсними маркерами збережуть свій початковий маркер.",
	"Task Status Cycle and Marks":
		"Цикл статусів завдань і маркери",
	"Define task states and their corresponding marks. The order from top to bottom defines the cycling sequence.":
		"Визначте стани завдань і відповідні маркери. Порядок зверху вниз визначає послідовність перемикання.",
	"Add Status":
		"Додати статус",
	"Completed Task Mover":
		"Переміщення завершених завдань",
	"Enable completed task mover":
		"Увімкнути переміщення завершених завдань",
	"Toggle this to enable commands for moving completed tasks to another file.":
		"Увімкніть, щоб увімкнути команди для переміщення завершених завдань до іншого файлу.",
	"Task marker type":
		"Тип маркера завдання",
	"Choose what type of marker to add to moved tasks":
		"Оберіть тип маркера, який буде додано до переміщених завдань",
	"Version marker text":
		"Текст маркера версії",
	"Text to append to tasks when moved (e.g., 'version 1.0')":
		"Текст, який додається до завдань при переміщенні (наприклад: 'версія 1.0')",
	"Date marker text":
		"Текст маркера дати",
	"Text to append to tasks when moved (e.g., 'archived on 2023-12-31')":
		"Текст, який додається до завдань при переміщенні (наприклад: 'архівовано 2023-12-31')",
	"Custom marker text":
		"Користувацький текст маркера",
	"Use {{DATE:format}} for date formatting (e.g., {{DATE:YYYY-MM-DD}}":
		"Використовуйте {{DATE:format}} для форматування дати (наприклад: {{DATE:YYYY-MM-DD}})",
	"Treat abandoned tasks as completed":
		"Вважати покинуті завдання завершеними",
	"If enabled, abandoned tasks will be treated as completed.":
		"Якщо увімкнено, покинуті завдання вважатимуться завершеними.",
	"Complete all moved tasks":
		"Завершувати всі переміщені завдання",
	"If enabled, all moved tasks will be marked as completed.":
		"Якщо увімкнено, усі переміщені завдання будуть позначені як завершені.",
	"With current file link":
		"З посиланням на поточний файл",
	"A link to the current file will be added to the parent task of the moved tasks.":
		"Посилання на поточний файл буде додано до батьківського завдання переміщених завдань.",
	"Say Thank You":
		"Сказати дякую",
	Donate:
		"Пожертвувати",
	"If you like this plugin, consider donating to support continued development:":
		"Якщо вам подобається цей додаток, подумайте про пожертву для підтримки подальшого розвитку:",
	"Add number to the Progress Bar":
		"Додати число до прогрес-бару",
	"Toggle this to allow this plugin to add tasks number to progress bar.":
		"Увімкніть, щоб додаток додавав число завдань до прогрес-бару.",
	"Show percentage":
		"Показати відсоток",
	"Toggle this to allow this plugin to show percentage in the progress bar.":
		"Увімкніть, щоб додаток показував відсоток у прогрес-барі.",
	"Customize progress text":
		"Налаштувати текст прогресу",
	"Toggle this to customize text representation for different progress percentage ranges.":
		"Увімкніть, щоб налаштувати текстове представлення для різних діапазонів відсотків прогресу.",
	"Progress Ranges":
		"Діапазони прогресу",
	"Define progress ranges and their corresponding text representations.":
		"Визначте діапазони прогресу та відповідні текстові представлення.",
	"Add new range":
		"Додати новий діапазон",
	"Add a new progress percentage range with custom text":
		"Додати новий діапазон відсотків прогресу з користувацьким текстом",
	"Min percentage (0-100)":
		"Мінімальний відсоток (0-100)",
	"Max percentage (0-100)":
		"Максимальний відсоток (0-100)",
	"Text template (use {{PROGRESS}})":
		"Шаблон тексту (використовуйте {{PROGRESS}})",
	"Reset to defaults":
		"Скинути до значень за замовчуванням",
	"Reset progress ranges to default values":
		"Скинути діапазони прогресу до значень за замовчуванням",
	Reset:
		"Скинути",
	"Priority Picker Settings":
		"Налаштування вибору пріоритету",
	"Toggle to enable priority picker dropdown for emoji and letter format priorities.":
		"Увімкніть, щоб активувати випадаючий список вибору пріоритету для форматів з емодзі та літерами.",
	"Enable priority picker":
		"Увімкнути вибір пріоритету",
	"Enable priority keyboard shortcuts":
		"Увімкнути гарячі клавіші для пріоритету",
	"Toggle to enable keyboard shortcuts for setting task priorities.":
		"Увімкніть, щоб активувати гарячі клавіші для встановлення пріоритетів завдань.",
	"Date picker":
		"Вибір дати",
	"Enable date picker":
		"Увімкнути вибір дати",
	"Toggle this to enable date picker for tasks. This will add a calendar icon near your tasks which you can click to select a date.":
		"Увімкніть, щоб активувати вибір дати для завдань. Це додасть іконку календаря поруч із завданнями, на яку можна натиснути для вибору дати.",
	"Date mark":
		"Маркер дати",
	"Emoji mark to identify dates. You can use multiple emoji separated by commas.":
		"Емодзі-маркер для позначення дат. Можна використовувати кілька емодзі, розділених комами.",
	"Quick capture":
		"Швидкий захват",
	"Enable quick capture":
		"Увімкнути швидкий захват",
	"Toggle this to enable Org-mode style quick capture panel. Press Alt+C to open the capture panel.":
		"Увімкніть, щоб активувати панель швидкого захоплення в стилі Org-mode. Натисніть Alt+C, щоб відкрити панель захоплення.",
	"Target file":
		"Цільовий файл",
	"The file where captured text will be saved. You can include a path, e.g., 'folder/Quick Capture.md'":
		"Файл, у якому зберігатиметься захоплений текст. Можна вказати шлях, наприклад: 'folder/Quick Capture.md'",
	"Placeholder text":
		"Текст-заповнювач",
	"Placeholder text to display in the capture panel":
		"Текст-заповнювач для відображення в панелі захоплення",
	"Append to file":
		"Додати до файлу",
	"If enabled, captured text will be appended to the target file. If disabled, it will replace the file content.":
		"Якщо увімкнено, захоплений текст додаватиметься до цільового файлу. Якщо вимкнено, він замінить вміст файлу.",
	"Task Filter":
		"Фільтр завдань",
	"Enable Task Filter":
		"Увімкнути фільтр завдань",
	"Toggle this to enable the task filter panel":
		"Увімкніть, щоб активувати панель фільтра завдань",
	"Preset Filters":
		"Попередньо встановлені фільтри",
	"Create and manage preset filters for quick access to commonly used task filters.":
		"Створюйте та керуйте попередньо встановленими фільтрами для швидкого доступу до часто використовуваних фільтрів завдань.",
	"Edit Filter: ":
		"Редагувати фільтр: ",
	"Filter name":
		"Назва фільтра",
	"Task Status":
		"Статус завдання",
	"Include or exclude tasks based on their status":
		"Включати, або виключати завдання на основі їхнього статусу",
	"Include Completed Tasks":
		"Включити завершені завдання",
	"Include In Progress Tasks":
		"Включити завдання в процесі",
	"Include Abandoned Tasks":
		"Включити покинуті завдання",
	"Include Not Started Tasks":
		"Включити не розпочаті завдання",
	"Include Planned Tasks":
		"Включити заплановані завдання",
	"Related Tasks":
		"Пов’язані завдання",
	"Include parent, child, and sibling tasks in the filter":
		"Включити батьківські, дочірні та сусідні завдання у фільтр",
	"Include Parent Tasks":
		"Включити батьківські завдання",
	"Include Child Tasks":
		"Включити дочірні завдання",
	"Include Sibling Tasks":
		"Включити сусідні завдання",
	"Advanced Filter":
		"Розширений фільтр",
	"Use boolean operations: AND, OR, NOT. Example: 'text content AND #tag1'":
		"Використовуйте булеві операції: AND, OR, NOT. Приклад: 'text content AND #tag1'",
	"Filter query":
		"Запит фільтра",
	"Filter out tasks":
		"Фільтрувати завдання",
	"If enabled, tasks that match the query will be hidden, otherwise they will be shown":
		"Якщо увімкнено, завдання, що відповідають запиту, будуть приховані, інакше вони відображатимуться",
	Save:
		"Зберегти",
	Cancel:
		"Скасувати",
	"Hide filter panel":
		"Приховати панель фільтра",
	"Show filter panel":
		"Показати панель фільтра",
	"Filter Tasks":
		"Фільтрувати завдання",
	"Preset filters":
		"Попередньо встановлені фільтри",
	"Select a saved filter preset to apply":
		"Оберіть збережений попередньо встановлений фільтр для застосування",
	"Select a preset...":
		"Оберіть попередньо встановлений...",
	Query:
		"Запит",
	"Use boolean operations: AND, OR, NOT. Example: 'text content AND #tag1 AND DATE:<2022-01-02 NOT PRIORITY:>=#B' - Supports >, <, =, >=, <=, != for PRIORITY and DATE.":
		"Використовуйте булеві операції: AND, OR, NOT. Приклад: 'text content AND #tag1 AND DATE:<2022-01-02 NOT PRIORITY:>=#B' - Підтримує >, <, =, >=, <=, != для PRIORITY і DATE.",
	"If true, tasks that match the query will be hidden, otherwise they will be shown":
		"Якщо увімкнено, завдання, що відповідають запиту, будуть приховані, інакше вони відображатимуться",
	Completed:
		"Завершено",
	"In Progress":
		"В процесі",
	Abandoned:
		"Покинуто",
	"Not Started":
		"Не розпочато",
	Planned:
		"Заплановано",
	"Include Related Tasks":
		"Включити пов’язані завдання",
	"Parent Tasks":
		"Батьківські завдання",
	"Child Tasks":
		"Дочірні завдання",
	"Sibling Tasks":
		"Сусідні завдання",
	Apply:
		"Застосувати",
	"New Preset":
		"Нова попередньо встановлена",
	"Preset saved":
		"Попередньо встановлена збережена",
	"No changes to save":
		"Немає змін для збереження",
	Close:
		"Закрити",
	"Capture to":
		"Захопити до",
	Capture:
		"Захопити",
	"Capture thoughts, tasks, or ideas...":
		"Захоплюйте думки, завдання чи ідеї...",
	Tomorrow:
		"Завтра",
	"In 2 days":
		"Через 2 дні",
	"In 3 days":
		"Через 3 дні",
	"In 5 days":
		"Через 5 днів",
	"In 1 week":
		"Через 1 тиждень",
	"In 10 days":
		"Через 10 днів",
	"In 2 weeks":
		"Через 2 тижні",
	"In 1 month":
		"Через 1 місяць",
	"In 2 months":
		"Через 2 місяці",
	"In 3 months":
		"Через 3 місяці",
	"In 6 months":
		"Через 6 місяців",
	"In 1 year":
		"Через 1 рік",
	"In 5 years":
		"Через 5 років",
	"In 10 years":
		"Через 10 років",
	"Highest priority":
		"Найвищий пріоритет",
	"High priority":
		"Високий пріоритет",
	"Medium priority":
		"Середній пріоритет",
	"No priority":
		"Без пріоритету",
	"Low priority":
		"Низький пріоритет",
	"Lowest priority":
		"Найнижчий пріоритет",
	"Priority A":
		"Пріоритет A",
	"Priority B":
		"Пріоритет B",
	"Priority C":
		"Пріоритет C",
	"Task Priority":
		"Пріоритет завдання",
	"Remove Priority":
		"Видалити пріоритет",
	"Cycle task status forward":
		"Перемкнути статус завдання вперед",
	"Cycle task status backward":
		"Перемкнути статус завдання назад",
	"Remove priority":
		"Видалити пріоритет",
	"Move task to another file":
		"Перемістити завдання до іншого файлу",
	"Move all completed subtasks to another file":
		"Перемістити всі завершені підзавдання до іншого файлу",
	"Move direct completed subtasks to another file":
		"Перемістити прямі завершені підзавдання до іншого файлу",
	"Move all subtasks to another file":
		"Перемістити всі підзавдання до іншого файлу",
	"Set priority":
		"Встановити пріоритет",
	"Toggle quick capture panel":
		"Перемкнути панель швидкого захоплення",
	"Quick capture (Global)":
		"Швидкий захват (глобальний)",
	"Toggle task filter panel":
		"Перемкнути панель фільтра завдань",
	"Filter Mode":
		"Режим фільтрації",
	"Choose whether to include or exclude tasks that match the filters":
		"Виберіть, включати чи виключати завдання, що відповідають фільтрам",
	"Show matching tasks":
		"Показати відповідні завдання",
	"Hide matching tasks":
		"Приховати відповідні завдання",
	"Choose whether to show or hide tasks that match the filters":
		"Виберіть, показувати чи приховувати завдання, що відповідають фільтрам",
	"Create new file:":
		"Створити новий файл:",
	"Completed tasks moved to":
		"Завершені завдання переміщені до",
	"Failed to create file:":
		"Не вдалося створити файл:",
	"Beginning of file":
		"Початок файлу",
	"Failed to move tasks:":
		"Не вдалося перемістити завдання:",
	"No active file found":
		"Активний файл не знайдено",
	"Task moved to":
		"Завдання переміщено до",
	"Failed to move task:":
		"Не вдалося перемістити завдання:",
	"Nothing to capture":
		"Немає що захопити",
	"Captured successfully":
		"Успішно захоплено",
	"Failed to save:":
		"Не вдалося зберегти:",
	"Captured successfully to":
		"Успішно захоплено до",
	Total:
		"Усього",
	Workflow:
		"Робочий процес",
	"Add as workflow root":
		"Додати як корінь робочого процесу",
	"Move to stage":
		"Перейти до етапу",
	"Complete stage":
		"Завершити етап",
	"Add child task with same stage":
		"Додати дочірнє завдання з тим самим етапом",
	"Could not open quick capture panel in the current editor":
		"Не вдалося відкрити панель швидкого захоплення в поточному редакторі",
	"Just started {{PROGRESS}}%":
		"Щойно розпочато {{PROGRESS}}%",
	"Making progress {{PROGRESS}}%":
		"Прогрес {{PROGRESS}}%",
	"Half way {{PROGRESS}}%":
		"На півдорозі {{PROGRESS}}%",
	"Good progress {{PROGRESS}}%":
		"Хороший прогрес {{PROGRESS}}%",
	"Almost there {{PROGRESS}}%":
		"Майже готово {{PROGRESS}}%",
	"Progress bar":
		"Прогрес-бар",
	"You can customize the progress bar behind the parent task(usually at the end of the task). You can also customize the progress bar for the task below the heading.":
		"Ви можете налаштувати прогрес-бар за батьківським завданням (зазвичай у кінці завдання). Також можна налаштувати прогрес-бар для завдань під заголовком.",
	"Hide progress bars":
		"Приховати прогрес-бари",
	"Parent task changer":
		"Зміна батьківського завдання",
	"Change the parent task of the current task.":
		"Змінити батьківське завдання поточного завдання.",
	"No preset filters created yet. Click 'Add New Preset' to create one.":
		"Попередньо встановлені фільтри ще не створені. Натисніть 'Додати нову попередньо встановлену', щоб створити одну.",
	"Configure task workflows for project and process management":
		"Налаштуйте робочі процеси завдань для керування проєктами та процесами",
	"Enable workflow":
		"Увімкнути робочий процес",
	"Toggle to enable the workflow system for tasks":
		"Увімкніть, щоб активувати систему робочих процесів для завдань",
	"Auto-add timestamp":
		"Автоматично додавати часову мітку",
	"Automatically add a timestamp to the task when it is created":
		"Автоматично додавати часову мітку до завдання під час його створення",
	"Timestamp format:":
		"Формат часової мітки:",
	"Timestamp format":
		"Формат часової мітки",
	"Remove timestamp when moving to next stage":
		"Видаляти часову мітку при переході до наступного етапу",
	"Remove the timestamp from the current task when moving to the next stage":
		"Видаляти часову мітку з поточного завдання при переході до наступного етапу",
	"Calculate spent time":
		"Розраховувати витрачений час",
	"Calculate and display the time spent on the task when moving to the next stage":
		"Розраховувати та відображати час, витрачений на завдання, при переході до наступного етапу",
	"Format for spent time:":
		"Формат для витраченого часу:",
	"Calculate spent time when move to next stage.":
		"Розраховувати витрачений час при переході до наступного етапу.",
	"Spent time format":
		"Формат витраченого часу",
	"Calculate full spent time":
		"Розраховувати повний витрачений час",
	"Calculate the full spent time from the start of the task to the last stage":
		"Розраховувати повний витрачений час від початку завдання до останнього етапу",
	"Auto remove last stage marker":
		"Автоматично видаляти маркер останнього етапу",
	"Automatically remove the last stage marker when a task is completed":
		"Автоматично видаляти маркер останнього етапу, коли завдання завершено",
	"Auto-add next task":
		"Автоматично додавати наступне завдання",
	"Automatically create a new task with the next stage when completing a task":
		"Автоматично створювати нове завдання з наступним етапом при завершенні завдання",
	"Workflow definitions":
		"Визначення робочих процесів",
	"Configure workflow templates for different types of processes":
		"Налаштуйте шаблони робочих процесів для різних типів процесів",
	"No workflow definitions created yet. Click 'Add New Workflow' to create one.":
		"Визначення робочих процесів ще не створені. Натисніть 'Додати новий робочий процес', щоб створити один.",
	"Edit workflow":
		"Редагувати робочий процес",
	"Remove workflow":
		"Видалити робочий процес",
	"Delete workflow":
		"Видалити робочий процес",
	Delete:
		"Видалити",
	"Add New Workflow":
		"Додати новий робочий процес",
	"New Workflow":
		"Новий робочий процес",
	"Create New Workflow":
		"Створити новий робочий процес",
	"Workflow name":
		"Назва робочого процесу",
	"A descriptive name for the workflow":
		"Описова назва для робочого процесу",
	"Workflow ID":
		"Ідентифікатор робочого процесу",
	"A unique identifier for the workflow (used in tags)":
		"Унікальний ідентифікатор для робочого процесу (використовується у мітках)",
	Description:
		"Опис",
	"Optional description for the workflow":
		"Необов’язковий опис для робочого процесу",
	"Describe the purpose and use of this workflow...":
		"Опишіть призначення та використання цього робочого процесу...",
	"Workflow Stages":
		"Етапи робочого процесу",
	"No stages defined yet. Add a stage to get started.":
		"Етапи ще не визначені. Додайте етап, щоб почати.",
	Edit:
		"Редагувати",
	"Move up":
		"Перемістити вгору",
	"Move down":
		"Перемістити вниз",
	"Sub-stage":
		"Підетап",
	"Sub-stage name":
		"Назва підетапу",
	"Sub-stage ID":
		"Ідентифікатор підетапу",
	"Next: ":
		"Далі: ",
	"Add Sub-stage":
		"Додати підетап",
	"New Sub-stage":
		"Новий підетап",
	"Edit Stage":
		"Редагувати етап",
	"Stage name":
		"Назва етапу",
	"A descriptive name for this workflow stage":
		"Описова назва для цього етапу робочого процесу",
	"Stage ID":
		"Ідентифікатор етапу",
	"A unique identifier for the stage (used in tags)":
		"Унікальний ідентифікатор для етапу (використовується у мітках)",
	"Stage type":
		"Тип етапу",
	"The type of this workflow stage":
		"Тип цього етапу робочого процесу",
	"Linear (sequential)":
		"Лінійний (послідовний)",
	"Cycle (repeatable)":
		"Циклічний (повторюваний)",
	"Terminal (end stage)":
		"Термінальний (кінцевий етап)",
	"Next stage":
		"Наступний етап",
	"The stage to proceed to after this one":
		"Етап, до якого потрібно перейти після цього",
	"Sub-stages":
		"Підетапи",
	"Define cycle sub-stages (optional)":
		"Визначте цикли підетапів (необов’язково)",
	"No sub-stages defined yet.":
		"Підетапи ще не визначені.",
	"Can proceed to":
		"Може перейти до",
	"Additional stages that can follow this one (for right-click menu)":
		"Додаткові етапи, які можуть слідувати за цим (для контекстного меню)",
	"No additional destination stages defined.":
		"Додаткові цільові етапи не визначені.",
	Remove:
		"Видалити",
	Add:
		"Додати",
	"Name and ID are required.":
		"Назва та ідентифікатор є обов’язковими.",
	"End of file":
		"Кінець файлу",
	"Include in cycle":
		"Включити в цикл",
	Preset:
		"Попередньо встановлена",
	"Preset name":
		"Назва попередньо встановленої",
	"Edit Filter":
		"Редагувати фільтр",
	"Add New Preset":
		"Додати нову попередньо встановлену",
	"New Filter":
		"Новий фільтр",
	"Reset to Default Presets":
		"Скинути до попередньо встановлених за замовчуванням",
	"This will replace all your current presets with the default set. Are you sure?":
		"Це замінить усі ваші поточні попередньо встановлені на набір за замовчуванням. Ви впевнені?",
	"Edit Workflow":
		"Редагувати робочий процес",
	General:
		"Загальні",
	"Progress Bar":
		"Прогрес-бар",
	"Task Mover":
		"Переміщення завдань",
	"Quick Capture":
		"Швидкий захват",
	"Date & Priority":
		"Дата та пріоритет",
	About:
		"Довідка",
	"Count sub children of current Task":
		"Враховувати дочірні завдання поточного завдання",
	"Toggle this to allow this plugin to count sub tasks when generating progress bar\t.":
		"Увімкніть, щоб додаток враховував дочірні завдання при створенні прогрес-бару.",
	"Configure task status settings":
		"Налаштувати параметри статусу завдань",
	"Configure which task markers to count or exclude":
		"Налаштувати, які маркери завдань враховувати, або виключати",
	"Task status cycle and marks":
		"Цикл статусів завдань і маркери",
	"About Task Genius":
		"Про Task Genius",
	Version:
		"Версія",
	Documentation:
		"Документація",
	"View the documentation for this plugin":
		"Переглянути документацію для цього плагіна",
	"Open Documentation":
		"Відкрити документацію",
	"Incomplete tasks":
		"Незавершені завдання",
	"In progress tasks":
		"Завдання в процесі",
	"Completed tasks":
		"Завершені завдання",
	"All tasks":
		"Усі завдання",
	"After heading":
		"Після заголовка",
	"End of section":
		"Кінець розділу",
	"Enable text mark in source mode":
		"Увімкнути текстовий маркер у вихідному режимі",
	"Make the text mark in source mode follow the task status cycle when clicked.":
		"Зробити так, щоб текстовий маркер у вихідному режимі слідував циклу статусу завдання при клацанні.",
	"Status name":
		"Назва статусу",
	"Progress display mode":
		"Режим відображення прогресу",
	"Choose how to display task progress":
		"Виберіть, як відображати прогрес завдання",
	"No progress indicators":
		"Без індикаторів прогресу",
	"Graphical progress bar":
		"Графічний прогрес-бар",
	"Text progress indicator":
		"Текстовий індикатор прогресу",
	"Both graphical and text":
		"Графічний і текстовий",
	"Toggle this to allow this plugin to count sub tasks when generating progress bar.":
		"Увімкніть, щоб додаток враховував дочірні завдання при створенні прогрес-бару.",
	"Progress format":
		"Формат прогресу",
	"Choose how to display the task progress":
		"Виберіть, як відображати прогрес завдання",
	"Percentage (75%)":
		"Відсоток (75%)",
	"Bracketed percentage ([75%])":
		"Відсоток у дужках ([75%])",
	"Fraction (3/4)":
		"Дріб (3/4)",
	"Bracketed fraction ([3/4])":
		"Дріб у дужках ([3/4])",
	"Detailed ([3✓ 1⟳ 0✗ 1? / 5])":
		"Детально ([3✓ 1⟳ 0✗ 1? / 5])",
	"Custom format":
		"Користувацький формат",
	"Range-based text":
		"Текст на основі діапазону",
	"Use placeholders like {{COMPLETED}}, {{TOTAL}}, {{PERCENT}}, etc.":
		"Використовуйте заповнювачі, такі як {{COMPLETED}}, {{TOTAL}}, {{PERCENT}} тощо.",
	"Preview:":
		"Попередній перегляд:",
	"Available placeholders":
		"Доступні заповнювачі",
	"Available placeholders: {{COMPLETED}}, {{TOTAL}}, {{IN_PROGRESS}}, {{ABANDONED}}, {{PLANNED}}, {{NOT_STARTED}}, {{PERCENT}}, {{COMPLETED_SYMBOL}}, {{IN_PROGRESS_SYMBOL}}, {{ABANDONED_SYMBOL}}, {{PLANNED_SYMBOL}}":
		"Доступні заповнювачі: {{COMPLETED}}, {{TOTAL}}, {{IN_PROGRESS}}, {{ABANDONED}}, {{PLANNED}}, {{NOT_STARTED}}, {{PERCENT}}, {{COMPLETED_SYMBOL}}, {{IN_PROGRESS_SYMBOL}}, {{ABANDONED_SYMBOL}}, {{PLANNED_SYMBOL}}",
	"Expression examples":
		"Приклади виразів",
	"Examples of advanced formats using expressions":
		"Приклади розширених форматів із використанням виразів",
	"Text Progress Bar":
		"Текстовий прогрес-бар",
	"Emoji Progress Bar":
		"Емодзі прогрес-бар",
	"Color-coded Status":
		"Статус із кольоровим кодуванням",
	"Status with Icons":
		"Статус із іконками",
	Preview:
		"Попередній перегляд",
	Use:
		"Використати",
	"Toggle this to show percentage instead of completed/total count.":
		"Увімкніть, щоб показувати відсоток замість кількості завершених/загальних.",
	"Customize progress ranges":
		"Налаштувати діапазони прогресу",
	"Toggle this to customize the text for different progress ranges.":
		"Увімкніть, щоб налаштувати текст для різних діапазонів прогресу.",
	"Apply Theme":
		"Застосувати тему",
	"Back to main settings":
		"Повернутися до основних налаштувань",
	"Support expression in format, like using data.percentages to get the percentage of completed tasks. And using math or even repeat operations to get the result.":
		"Підтримка виразів у форматі, наприклад, використання data.percentages для отримання відсотка завершених завдань. А також використання математичних операцій, або операцій повторення для отримання результату.",
	"Support expression in format, like using data.percentages to get the percentage of completed tasks. And using math or even repeat functions to get the result.":
		"Підтримка виразів у форматі, наприклад, використання data.percentages для отримання відсотка завершених завдань. А також використання математичних операцій, або функцій повторення для отримання результату.",
	"Target File:":
		"Цільовий файл:",
	"Task Properties":
		"Властивості завдання",
	"Start Date":
		"Дата початку",
	"Due Date":
		"Термін виконання",
	"Scheduled Date":
		"Запланована дата",
	Priority:
		"Пріоритет",
	None:
		"Немає",
	Highest:
		"Найвищий",
	High:
		"Високий",
	Medium:
		"Середній",
	Low:
		"Низький",
	Lowest:
		"Найнижчий",
	Project:
		"Проєкт",
	"Project name":
		"Назва проєкту",
	Context:
		"Контекст",
	Recurrence:
		"Повторення",
	"e.g., every day, every week":
		"наприклад: щодня, щотижня",
	"Task Content":
		"Вміст завдання",
	"Task Details":
		"Деталі завдання",
	File:
		"Файл",
	"Edit in File":
		"Редагувати у файлі",
	"Mark Incomplete":
		"Позначити як незавершене",
	"Mark Complete":
		"Позначити як завершене",
	"Task Title":
		"Назва завдання",
	Tags:
		"Мітки",
	"e.g. every day, every 2 weeks":
		"наприклад: щодня, кожні 2 тижні",
	Forecast:
		"Прогноз",
	"0 actions, 0 projects":
		"0 дій, 0 проєктів",
	"Toggle list/tree view":
		"Перемкнути вигляд списку/дерева",
	"Focusing on Work":
		"Фокусування на роботі",
	Unfocus:
		"Зняти фокус",
	"Past Due":
		"Прострочено",
	Today:
		"Сьогодні",
	Future:
		"Майбутнє",
	actions:
		"дії",
	project:
		"проєкт",
	"Coming Up":
		"Наступні",
	Task:
		"Завдання",
	Tasks:
		"Завдання",
	"No upcoming tasks":
		"Немає наступних завдань",
	"No tasks scheduled":
		"Немає запланованих завдань",
	"0 tasks":
		"0 завдань",
	"Filter tasks...":
		"Фільтрувати завдання...",
	Projects:
		"Проєкти",
	"Toggle multi-select":
		"Перемкнути множинний вибір",
	"No projects found":
		"Проєкти не знайдені",
	"projects selected":
		"вибрано проєктів",
	tasks:
		"завдання",
	"No tasks in the selected projects":
		"Немає завдань у вибраних проєктах",
	"Select a project to see related tasks":
		"Оберіть проєкт, щоб побачити пов’язані завдання",
	"Configure Review for":
		"Налаштувати огляд для",
	"Review Frequency":
		"Частота огляду",
	"How often should this project be reviewed":
		"Як часто потрібно переглядати цей проєкт",
	"Custom...":
		"Користувацький...",
	"e.g., every 3 months":
		"наприклад: кожні 3 місяці",
	"Last Reviewed":
		"Останній огляд",
	"Please specify a review frequency":
		"Будь ласка, вкажіть частоту огляду",
	"Review schedule updated for":
		"Графік огляду оновлено для",
	"Review Projects":
		"Огляд проєктів",
	"Select a project to review its tasks.":
		"Оберіть проєкт для огляду його завдань.",
	"Configured for Review":
		"Налаштовано для огляду",
	"Not Configured":
		"Не налаштовано",
	"No projects available.":
		"Немає доступних проєктів.",
	"Select a project to review.":
		"Оберіть проєкт для огляду.",
	"Show all tasks":
		"Показати всі завдання",
	"Showing all tasks, including completed tasks from previous reviews.":
		"Показані всі завдання, включно із завершеними завданнями з попередніх оглядів.",
	"Show only new and in-progress tasks":
		"Показати лише нові та завдання в процесі",
	"No tasks found for this project.":
		"Для цього проєкту завдань не знайдено.",
	"Review every":
		"Огляд кожні",
	never:
		"ніколи",
	"Last reviewed":
		"Останній огляд",
	"Mark as Reviewed":
		"Позначити як переглянуте",
	"No review schedule configured for this project":
		"Для цього проєкту не налаштовано графік огляду",
	"Configure Review Schedule":
		"Налаштувати графік огляду",
	"Project Review":
		"Огляд проєкту",
	"Select a project from the left sidebar to review its tasks.":
		"Оберіть проєкт у лівій бічній панелі, щоб переглянути його завдання.",
	Inbox:
		"Вхідні",
	Flagged:
		"Позначені",
	Review:
		"Огляд",
	"tags selected":
		"вибрано міток",
	"No tasks with the selected tags":
		"Немає завдань із вибраними мітками",
	"Select a tag to see related tasks":
		"Оберіть мітку, щоб побачити пов’язані завдання",
	"Open Task Genius view":
		"Відкрити вигляд Task Genius",
	"Task capture with metadata":
		"Захоплення завдання з метаданими",
	"Refresh task index":
		"Оновити індекс завдань",
	"Refreshing task index...":
		"Оновлення індексу завдань...",
	"Task index refreshed":
		"Індекс завдань оновлено",
	"Failed to refresh task index":
		"Не вдалося оновити індекс завдань",
	"Force reindex all tasks":
		"Примусово переіндексувати всі завдання",
	"Clearing task cache and rebuilding index...":
		"Очищення кешу завдань і перебудова індексу...",
	"Task index completely rebuilt":
		"Індекс завдань повністю перебудовано",
	"Failed to force reindex tasks":
		"Не вдалося примусово переіндексувати завдання",
	"Task Genius View":
		"Вигляд Task Genius",
	"Toggle Sidebar":
		"Перемкнути бічну панель",
	Details:
		"Деталі",
	View:
		"Вигляд",
	"Task Genius view is a comprehensive view that allows you to manage your tasks in a more efficient way.":
		"Вигляд Task Genius — це комплексний вигляд, який дозволяє більш ефективно керувати завданнями.",
	"Enable task genius view":
		"Увімкнути вигляд Task Genius",
	"Select a task to view details":
		"Оберіть завдання, щоб переглянути деталі",
	Status:
		"Статус",
	"Comma separated":
		"Розділені комами",
	Focus:
		"Фокус",
	"Loading more...":
		"Завантаження ще...",
	projects:
		"проєкти",
	"No tasks for this section.":
		"Немає завдань для цього розділу.",
	"No tasks found.":
		"Завдання не знайдені.",
	Complete:
		"Завершити",
	"Switch status":
		"Перемкнути статус",
	"Rebuild index":
		"Перебудувати індекс",
	Rebuild:
		"Перебудувати",
	"0 tasks, 0 projects":
		"0 завдань, 0 проєктів",
	"New Custom View":
		"Новий користувацький вигляд",
	"Create Custom View":
		"Створити користувацький вигляд",
	"Edit View: ":
		"Редагувати вигляд: ",
	"View Name":
		"Назва вигляду",
	"My Custom Task View":
		"Мій користувацький вигляд завдань",
	"Icon Name":
		"Назва іконки",
	"Enter any Lucide icon name (e.g., list-checks, filter, inbox)":
		"Введіть будь-яку назву іконки Lucide (наприклад: list-checks, filter, inbox)",
	"Filter Rules":
		"Правила фільтрації",
	"Hide Completed and Abandoned Tasks":
		"Приховати завершені та покинуті завдання",
	"Hide completed and abandoned tasks in this view.":
		"Приховати завершені та покинуті завдання в цьому вигляді.",
	"Text Contains":
		"Текст містить",
	"Filter tasks whose content includes this text (case-insensitive).":
		"Фільтрувати завдання, вміст яких включає цей текст (без урахування регістру).",
	"Tags Include":
		"Мітки включають",
	"Task must include ALL these tags (comma-separated).":
		"Завдання має включати ВСІ ці мітки (розділені комами).",
	"Tags Exclude":
		"Мітки виключають",
	"Task must NOT include ANY of these tags (comma-separated).":
		"Завдання НЕ має включати ЖОДЕН із цих міток (розділені комами).",
	"Project Is":
		"Проєкт",
	"Task must belong to this project (exact match).":
		"Завдання має належати до цього проєкту (точна відповідність).",
	"Priority Is":
		"Пріоритет",
	"Task must have this priority (e.g., 1, 2, 3).":
		"Завдання має мати цей пріоритет (наприклад: 1, 2, 3).",
	"Status Include":
		"Статус включає",
	"Task status must be one of these (comma-separated markers, e.g., /,>).":
		"Статус завдання має бути одним із цих (маркери, розділені комами, наприклад: /,>).",
	"Status Exclude":
		"Статус виключає",
	"Task status must NOT be one of these (comma-separated markers, e.g., -,x).":
		"Статус завдання НЕ має бути одним із цих (маркери, розділені комами, наприклад: -,x).",
	"Use YYYY-MM-DD or relative terms like 'today', 'tomorrow', 'next week', 'last month'.":
		"Використовуйте YYYY-MM-DD, або відносні терміни, такі як 'сьогодні', 'завтра', 'наступний тиждень', 'минулий місяць'.",
	"Due Date Is":
		"Термін виконання",
	"Start Date Is":
		"Дата початку",
	"Scheduled Date Is":
		"Запланована дата",
	"Path Includes":
		"Шлях включає",
	"Task must contain this path (case-insensitive).":
		"Завдання має містити цей шлях (без урахування регістру).",
	"Path Excludes":
		"Шлях виключає",
	"Task must NOT contain this path (case-insensitive).":
		"Завдання НЕ має містити цей шлях (без урахування регістру).",
	"Unnamed View":
		"Безіменний вигляд",
	"View configuration saved.":
		"Конфігурація вигляду збережена.",
	"Hide Details":
		"Приховати деталі",
	"Show Details":
		"Показати деталі",
	"View Config":
		"Конфігурація вигляду",
	"View Configuration":
		"Конфігурація вигляду",
	"Configure the Task Genius sidebar views, visibility, order, and create custom views.":
		"Налаштуйте вигляди бічної панелі Task Genius, їхню видимість, порядок і створюйте користувацькі вигляди.",
	"Manage Views":
		"Керування виглядами",
	"Configure sidebar views, order, visibility, and hide/show completed tasks per view.":
		"Налаштуйте вигляди бічної панелі, їхній порядок, видимість і приховування/показ завершених завдань для кожного вигляду.",
	"Show in sidebar":
		"Показати в бічній панелі",
	"Edit View":
		"Редагувати вигляд",
	"Move Up":
		"Перемістити вгору",
	"Move Down":
		"Перемістити вниз",
	"Delete View":
		"Видалити вигляд",
	"Add Custom View":
		"Додати користувацький вигляд",
	"Error: View ID already exists.":
		"Помилка: Ідентифікатор вигляду вже існує.",
	Events:
		"Події",
	Plan:
		"План",
	Year:
		"Рік",
	Month:
		"Місяць",
	Week:
		"Тиждень",
	Day:
		"День",
	Agenda:
		"Порядок денний",
	"Back to categories":
		"Повернутися до категорій",
	"No matching options found":
		"Відповідних варіантів не знайдено",
	"No matching filters found":
		"Відповідних фільтрів не знайдено",
	Tag:
		"Мітка",
	"File Path":
		"Шлях до файлу",
	"Add filter":
		"Додати фільтр",
	"Clear all":
		"Очистити все",
	"Add Card":
		"Додати картку",
	"First Day of Week":
		"Перший день тижня",
	"Overrides the locale default for calendar views.":
		"Перевизначає налаштування локалі за замовчуванням для виглядів календаря.",
	"Show checkbox":
		"Показати прапорець",
	"Show a checkbox for each task in the kanban view.":
		"Показувати прапорець для кожного завдання у вигляді канбан.",
	"Locale Default":
		"Локаль за замовчуванням",
	"Use custom goal for progress bar":
		"Використовувати користувацьку мету для прогрес-бару",
	"Toggle this to allow this plugin to find the pattern g::number as goal of the parent task.":
		"Увімкніть, щоб додаток шукав шаблон g::number як мету батьківського завдання.",
	"Prefer metadata format of task":
		"Віддавати перевагу формату метаданих завдання",
	"You can choose dataview format or tasks format, that will influence both index and save format.":
		"Ви можете вибрати формат dataview, або tasks, що вплине на формат індексу та збереження.",
};

export default translations;
