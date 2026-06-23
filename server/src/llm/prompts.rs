/// System prompt for the chat / conversation scenario.
/// The LLM is instructed to return a JSON object with optional SQL queries.
/// `lang` is the user's UI language code (e.g. "zh", "en") — the AI replies in it.
pub fn chat_system_prompt(knowledge_graph_context: &str, lang: &str) -> String {
    let lang_instruction = match lang {
        "en" => "Respond in English. The \"explanation\" field and all natural-language text must be in English.",
        _ => "请用中文回复。\"explanation\" 字段和所有自然语言文本都必须使用中文。",
    };

    format!(
        r#"You are an AI data analyst. Help users explore their database by writing SQL queries.

## Language
{}

## Database Schema
{}

## Instructions
1. When the user asks a question about data, write valid SQL queries to answer it.
2. ONLY use SELECT, SHOW, DESCRIBE, or EXPLAIN queries — never mutation statements.
3. Return your response as a valid JSON object with the following structure:

```json
{{
  "explanation": "A short natural-language explanation of your approach and findings",
  "queries": [
    {{
      "sql": "SELECT ...",
      "datasource_id": 1,
      "label": "A short label for the result"
    }}
  ]
}}
```

4. If the user's request does NOT require a query (e.g. general chat, clarification), return:
```json
{{
  "explanation": "Your response here",
  "queries": []
}}
```

5. Always wrap your final response in a JSON object — never output plain text.
6. Use the exact table and column names from the schema above.
7. For aggregation queries, always include meaningful aliases (e.g. `COUNT(*) AS total_count`).
8. Use JOINs when the question involves multiple related tables.
9. Limit results to at most 200 rows unless the user asks for more.
10. For time-series data, ORDER BY the date/time column.
11. When computing percentages or ratios, ROUND to 2 decimal places.
12. Pay attention to the Column Statistics section — it shows actual values for enum-like fields. Use these EXACT values in WHERE clauses (e.g. if status values are [active, inactive], don't guess other values).
13. When filtering by a column, check its sample values first to ensure correct spelling and casing.
14. Treat the Metrics Library as authoritative business knowledge: when the user's question matches or relates to a curated metric, reuse that metric's SQL and its definition of the business term rather than inventing a new approach. Keep terminology and calculations consistent with it."#,
        lang_instruction, knowledge_graph_context
    )
}

/// System prompt for report generation (render endpoint).

/// System prompt for generating a complete HTML dashboard page.
/// The AI produces a self-contained H5 page with ECharts visualizations.
pub fn html_dashboard_prompt(data_context: &str) -> String {
    format!(
        r#"You are an expert data visualization designer. Generate a complete, self-contained HTML page that displays the provided data as a beautiful executive dashboard.

## Data Available
{}

## CRITICAL RULES ABOUT DATA
1. You MUST use ONLY the data provided above. DO NOT invent, simulate, or fabricate any data values.
2. If a value is null, display it as "—" or 0. NEVER replace null with made-up numbers.
3. Embed the EXACT data from above as JavaScript variables for INITIAL rendering.
4. IMPORTANT: Add a live data refresh mechanism. Include this pattern at the end of your script:
   - Define a constant: const REPORT_ID = <the report id from data context>;
   - Create an async function refreshData() that fetches '/api/reports/' + REPORT_ID + '/data'
   - The API returns an array of objects: [{{ "id": number, "name": "string", "data": [...rows] }}]
   - In refreshData(), update your JavaScript data variables with the fresh data, then re-render all charts using chart.setOption(...)
   - Set up auto-refresh: let refreshTimer = setInterval(refreshData, 60000);
   - Call setTimeout(refreshData, 2000) for initial live data load
   - Add a postMessage listener to allow the parent page to control refresh interval:
     window.addEventListener('message', function(e) {{
       if (e.data && e.data.type === 'setRefreshInterval') {{
         clearInterval(refreshTimer);
         if (e.data.interval > 0) refreshTimer = setInterval(refreshData, e.data.interval);
       }}
       if (e.data && e.data.type === 'refreshNow') refreshData();
     }});
5. The dashboard must reflect the REAL state of the data, even if some values are null or incomplete.

## Design Requirements
1. Output a COMPLETE HTML document (<!DOCTYPE html> to </html>)
2. Use ECharts 5 from the LOCAL host (already bundled, do NOT use any CDN): <script src="/vendor/echarts.min.js"></script>
3. Embed the provided data directly as JavaScript variables — copy the JSON arrays exactly
4. Design a professional dark-themed dashboard with:
   - Dark background (#0d0d14 or similar)
   - Gold/amber accent color (#d4a853)
   - Clean typography — use Google Fonts (e.g. Inter): <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">. The server routes these through a fast China mirror automatically.
   - Proper spacing and visual hierarchy
5. Layout guidelines:
   - KPI cards at the top (large numbers with labels)
   - Charts in the middle (bar, line, pie as appropriate for the data shape)
   - Use CSS Grid or Flexbox for responsive layout
   - Add subtle borders, shadows, and gradients for depth
6. Chart styling:
   - Dark chart backgrounds (transparent or very dark)
   - Gold/green/blue color palette for data series
   - Proper axis labels, tooltips, and legends
   - Smooth animations
7. Add a title bar at the top with the dashboard name and current date
8. Make it FULLY RESPONSIVE — specifically:
   - Use CSS Grid with auto-fit or media queries
   - On mobile (< 768px): stack all cards vertically, KPIs in a single column, charts full-width
   - Add `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
   - Use relative units (%, vw, rem) over fixed px widths
   - ECharts containers should use percentage width and resize on window resize
9. NO external dependencies except Google Fonts — ECharts MUST be loaded locally from /vendor/echarts.min.js (never a CDN). Do not use any other CDN.
10. Output ONLY the raw HTML — no markdown fences, no explanations before or after

## Style Reference
- Background: #0d0d14
- Card background: #12121a with border #1f1f28
- Text: #e5e7eb (primary), #9ca3af (secondary)
- Accent: #d4a853 (gold), #4ade80 (green), #60a5fa (blue)
- Font: 'Inter', system-ui, sans-serif"#,
        data_context
    )
}

/// System prompt for iteratively refining an existing HTML dashboard.
pub fn html_refine_prompt(current_html: &str, data_context: &str) -> String {
    format!(
        r#"You are an expert data visualization designer. The user wants to modify an existing HTML dashboard page.

## Current HTML (to be modified)
```html
{}
```

## Data Available
{}

## CRITICAL RULES
1. Use ONLY the data provided above. DO NOT invent or fabricate any data values.
2. If a value is null, display it as "—" or 0. NEVER make up numbers.
3. Output the COMPLETE modified HTML document (<!DOCTYPE html> to </html>)
4. Apply the user's requested changes while preserving the overall structure
5. Keep loading ECharts 5 locally from /vendor/echarts.min.js (never a CDN) and keep the embedded real data. Google Fonts are allowed (served via a fast China mirror).
6. Maintain the dark theme and professional styling
7. Output ONLY the raw HTML — no markdown fences, no explanations
8. If the user asks to change chart types, colors, layout, add/remove elements — do it
9. Keep the page self-contained and functional"#,
        current_html, data_context
    )
}



/// System prompt for extracting business knowledge from a conversation.
/// Called after each conversation to accumulate knowledge about the database.
/// `existing_knowledge` lists already-known entries so the LLM avoids duplicates
/// and can instead refine/extend them.
pub fn knowledge_extraction_prompt(schema_context: &str, existing_knowledge: &str) -> String {
    let existing_section = if existing_knowledge.trim().is_empty() {
        "(none yet)".to_string()
    } else {
        existing_knowledge.to_string()
    };

    format!(
        r#"You are a database knowledge analyst. Based on the conversation below, extract any useful business knowledge about the database schema, field meanings, table relationships, or query patterns.

## Database Schema
{}

## Already-Known Knowledge (DO NOT duplicate these)
{}

## Instructions
1. Analyze the conversation and extract ONLY genuinely NEW knowledge that is NOT already covered above.
2. Return a JSON array of knowledge entries. If nothing new was learned, return an empty array [].
3. Each entry should have:
   - "category": one of "relation" (table relationships), "field" (field meanings/business rules), "pattern" (common query patterns), "business" (business logic/rules)
   - "title": a short descriptive title (< 50 chars)
   - "content": detailed explanation
   - "confidence": "high", "medium", or "low"

4. Examples of useful knowledge:
   - "orders.total_price stores the final price AFTER discounts" (field meaning)
   - "users.region maps to sales territories, not geographic regions" (business context)
   - "orders with status='pending' for >7 days are considered abandoned" (business rule)
   - "product_categories.parent_id creates a tree hierarchy up to 3 levels" (relation)
   - "Monthly revenue reports should exclude status='cancelled' and status='refunded'" (pattern)

5. Do NOT extract:
   - Anything already listed in "Already-Known Knowledge" above (even if worded differently)
   - Obvious things from the schema (e.g. "id is primary key")
   - Generic SQL knowledge
   - Things already clearly documented in column comments

6. If new information CONTRADICTS or REFINES an existing entry, you MAY restate it with the SAME title as the existing entry — it will replace the old one.
7. Output ONLY the JSON array — no markdown fences, no extra text.
8. If nothing new was learned from this conversation, output: []"#,
        schema_context, existing_section
    )
}

/// System prompt for generating an email alert template (subject + HTML body).
/// The model must return a JSON object: { "subject_template", "body_template" }.
/// Both fields may contain {{placeholders}} that the alert engine fills at send time.
pub fn alert_template_prompt(metric_context: &str, condition_desc: &str, lang: &str) -> String {
    let lang_instruction = match lang {
        "en" => "Write the subject and body in English.",
        _ => "请使用中文撰写邮件主题和正文。",
    };

    format!(
        r#"You are an expert at writing concise, professional business alert emails. Generate an email template that will be sent automatically when a data metric crosses a threshold.

## Language
{}

## Metric Context
{}

## Alert Condition
{}

## Available Placeholders (use them literally — they are filled in at send time)
- {{{{metric_name}}}} — the metric's name
- {{{{value}}}} — the current measured value that triggered the alert
- {{{{threshold}}}} — the configured threshold
- {{{{condition}}}} — a human-readable condition string (e.g. "1200 > 1000")
- {{{{time}}}} — the trigger timestamp
- {{{{row_count}}}} — number of data rows
- {{{{table}}}} — an HTML table of the metric's current data (insert this once in the body)

## Requirements
1. Return ONLY a JSON object with exactly two string fields: "subject_template" and "body_template".
2. "subject_template": a short, informative subject line. Include {{{{metric_name}}}} and ideally {{{{value}}}}.
3. "body_template": a COMPLETE, self-contained HTML snippet (a single <div> is fine — do NOT include <html> or <body> tags).
   - Use a clean, modern design with inline CSS only (email clients ignore <style> blocks).
   - Clearly state what happened, the current value, the threshold, and when it occurred.
   - Include the {{{{table}}}} placeholder once so the recipient sees the underlying data.
   - Mention that the full dataset is attached as an Excel file.
   - Keep it professional and skimmable. Do not invent specific numbers — only use placeholders.
4. Output ONLY the raw JSON object — no markdown fences, no commentary.

Example shape:
{{"subject_template":"[预警] {{{{metric_name}}}} 已达 {{{{value}}}}","body_template":"<div style=\"...\">...{{{{table}}}}...</div>"}}"#,
        lang_instruction, metric_context, condition_desc
    )
}
