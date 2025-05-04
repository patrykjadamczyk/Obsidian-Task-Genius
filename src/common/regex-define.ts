// Task identification
const TASK_REGEX = /^(([\s>]*)?(-|\d+\.|\*|\+)\s\[(.)\])\s*(.*)$/m;

// --- Emoji/Tasks Style Regexes ---
const EMOJI_START_DATE_REGEX = /🛫\s*(\d{4}-\d{2}-\d{2})/;
const EMOJI_COMPLETED_DATE_REGEX = /✅\s*(\d{4}-\d{2}-\d{2})/;
const EMOJI_DUE_DATE_REGEX = /📅\s*(\d{4}-\d{2}-\d{2})/;
const EMOJI_SCHEDULED_DATE_REGEX = /⏳\s*(\d{4}-\d{2}-\d{2})/;
const EMOJI_CREATED_DATE_REGEX = /➕\s*(\d{4}-\d{2}-\d{2})/;
const EMOJI_RECURRENCE_REGEX = /🔁\s*(.*?)(?=\s(?:🗓️|🛫|⏳|✅|➕|🔁|@|#)|$)/u;
const EMOJI_PRIORITY_REGEX = /(([🔺⏫🔼🔽⏬️⏬])|(\[#[A-E]\]))/u; // Using the corrected variant selector
const EMOJI_CONTEXT_REGEX = /@([\w-]+)/g;
const EMOJI_TAG_REGEX =
	/#[^\u2000-\u206F\u2E00-\u2E7F'!"#$%&()*+,.:;<=>?@^`{|}~\[\]\\\s]+/g; // Includes #project/ tags
const EMOJI_PROJECT_PREFIX = "#project/";

// --- Dataview Style Regexes ---
const DV_START_DATE_REGEX = /\[(?:start|🛫)::\s*(\d{4}-\d{2}-\d{2})\]/i;
const DV_COMPLETED_DATE_REGEX =
	/\[(?:completion|✅)::\s*(\d{4}-\d{2}-\d{2})\]/i;
const DV_DUE_DATE_REGEX = /\[(?:due|🗓️)::\s*(\d{4}-\d{2}-\d{2})\]/i;
const DV_SCHEDULED_DATE_REGEX = /\[(?:scheduled|⏳)::\s*(\d{4}-\d{2}-\d{2})\]/i;
const DV_CREATED_DATE_REGEX = /\[(?:created|➕)::\s*(\d{4}-\d{2}-\d{2})\]/i;
const DV_RECURRENCE_REGEX = /\[(?:repeat|recurrence|🔁)::\s*([^\]]+)\]/i;
const DV_PRIORITY_REGEX = /\[priority::\s*([^\]]+)\]/i;
const DV_PROJECT_REGEX = /\[project::\s*([^\]]+)\]/i;
const DV_CONTEXT_REGEX = /\[context::\s*([^\]]+)\]/i;
// Dataview Tag Regex is the same, applied after DV field removal
const ANY_DATAVIEW_FIELD_REGEX = /\[\w+(?:|🗓️|✅|➕|🛫|⏳|🔁)::\s*[^\]]+\]/gi;

export {
	TASK_REGEX,
	EMOJI_START_DATE_REGEX,
	EMOJI_COMPLETED_DATE_REGEX,
	EMOJI_DUE_DATE_REGEX,
	EMOJI_SCHEDULED_DATE_REGEX,
	EMOJI_CREATED_DATE_REGEX,
	EMOJI_RECURRENCE_REGEX,
	EMOJI_PRIORITY_REGEX,
	EMOJI_CONTEXT_REGEX,
	EMOJI_TAG_REGEX,
	EMOJI_PROJECT_PREFIX,
	DV_START_DATE_REGEX,
	DV_COMPLETED_DATE_REGEX,
	DV_DUE_DATE_REGEX,
	DV_SCHEDULED_DATE_REGEX,
	DV_CREATED_DATE_REGEX,
	DV_RECURRENCE_REGEX,
	DV_PRIORITY_REGEX,
	DV_PROJECT_REGEX,
	DV_CONTEXT_REGEX,
	ANY_DATAVIEW_FIELD_REGEX,
};
