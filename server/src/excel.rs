//! Build an `.xlsx` workbook from metric result rows (an array of JSON objects).

use rust_xlsxwriter::{Format, FormatBorder, Workbook};
use serde_json::Value;

/// Render a metric's result rows into an `.xlsx` file, returned as bytes.
///
/// `rows` is expected to be a JSON array of flat objects (the shape produced by
/// the query executor). The sheet gets a bold header row derived from the union
/// of keys, followed by one row per record.
pub fn build_metric_xlsx(sheet_name: &str, rows: &Value) -> Result<Vec<u8>, String> {
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();

    // Excel sheet names are limited to 31 chars and forbid a few characters.
    let safe_name = sanitize_sheet_name(sheet_name);
    worksheet
        .set_name(&safe_name)
        .map_err(|e| format!("Failed to set sheet name: {}", e))?;

    let header_format = Format::new()
        .set_bold()
        .set_background_color(0x1F1F28)
        .set_font_color(0xD4A853)
        .set_border(FormatBorder::Thin);

    let cell_format = Format::new().set_border(FormatBorder::Thin);

    let empty: Vec<Value> = Vec::new();
    let records = rows.as_array().unwrap_or(&empty);

    // Collect column order: keys from the first row, then any new keys later rows add.
    let mut columns: Vec<String> = Vec::new();
    for rec in records {
        if let Some(obj) = rec.as_object() {
            for k in obj.keys() {
                if !columns.iter().any(|c| c == k) {
                    columns.push(k.clone());
                }
            }
        }
    }

    if columns.is_empty() {
        worksheet
            .write_string(0, 0, "No data")
            .map_err(|e| e.to_string())?;
        let buf = workbook.save_to_buffer().map_err(|e| e.to_string())?;
        return Ok(buf);
    }

    // Header row
    for (col_idx, col) in columns.iter().enumerate() {
        worksheet
            .write_string_with_format(0, col_idx as u16, col, &header_format)
            .map_err(|e| e.to_string())?;
    }

    // Data rows
    for (row_idx, rec) in records.iter().enumerate() {
        let r = (row_idx + 1) as u32;
        let obj = rec.as_object();
        for (col_idx, col) in columns.iter().enumerate() {
            let c = col_idx as u16;
            let val = obj.and_then(|o| o.get(col)).unwrap_or(&Value::Null);
            write_value(worksheet, r, c, val, &cell_format)?;
        }
    }

    // Reasonable default column widths.
    for col_idx in 0..columns.len() {
        let _ = worksheet.set_column_width(col_idx as u16, 18);
    }

    let buf = workbook
        .save_to_buffer()
        .map_err(|e| format!("Failed to serialize workbook: {}", e))?;
    Ok(buf)
}

fn write_value(
    worksheet: &mut rust_xlsxwriter::Worksheet,
    row: u32,
    col: u16,
    val: &Value,
    fmt: &Format,
) -> Result<(), String> {
    match val {
        Value::Null => {
            worksheet
                .write_string_with_format(row, col, "", fmt)
                .map_err(|e| e.to_string())?;
        }
        Value::Bool(b) => {
            worksheet
                .write_string_with_format(row, col, if *b { "true" } else { "false" }, fmt)
                .map_err(|e| e.to_string())?;
        }
        Value::Number(n) => {
            if let Some(f) = n.as_f64() {
                worksheet
                    .write_number_with_format(row, col, f, fmt)
                    .map_err(|e| e.to_string())?;
            } else {
                worksheet
                    .write_string_with_format(row, col, &n.to_string(), fmt)
                    .map_err(|e| e.to_string())?;
            }
        }
        Value::String(s) => {
            worksheet
                .write_string_with_format(row, col, s, fmt)
                .map_err(|e| e.to_string())?;
        }
        other => {
            worksheet
                .write_string_with_format(row, col, &other.to_string(), fmt)
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

/// Excel worksheet names: max 31 chars, cannot contain : \ / ? * [ ].
fn sanitize_sheet_name(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .map(|c| match c {
            ':' | '\\' | '/' | '?' | '*' | '[' | ']' => '_',
            other => other,
        })
        .collect();
    let trimmed = cleaned.trim();
    let result = if trimmed.is_empty() { "Sheet1" } else { trimmed };
    result.chars().take(31).collect()
}
