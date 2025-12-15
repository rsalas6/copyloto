# CopyLoto

Overlay app for sequential JSON data copying. Load a JSON file and copy values one by one with keyboard shortcuts.

## Installation

```bash
npm install -g copyloto
```

## Usage

```bash
copyloto
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Up` | Previous row |
| `Ctrl+Down` | Next row |
| `Ctrl+Left` | Previous field |
| `Ctrl+Right` | Next field |
| `Ctrl+Space` | Copy current value and advance |

### Loading Data

1. Click the upload icon or press the load button
2. Choose to open a JSON file or paste JSON directly
3. Configure which fields to display and copy

### Settings

- Dark mode
- Opacity control
- Font size adjustment
- Field visibility and copy order

## JSON Format

Works with any JSON array:

```json
[
  { "id": 1, "name": "Item 1", "value": "abc" },
  { "id": 2, "name": "Item 2", "value": "def" }
]
```

Or nested structures - select the array path in settings.

### Auto-configuration

Embed a `@copyloto` (or `copyloto_config`) object in your JSON to auto-configure on load:

```json
{
  "@copyloto": {
    "array_path": "items",
    "display_fields": ["name", "category"],
    "copy_fields": ["id", "value"],
    "color_rules": [
      { "field": "category", "operator": "==", "value": "urgent", "color": "#ff6b6b" },
      { "field": "category", "operator": "==", "value": "normal", "color": "#50c878" }
    ]
  },
  "items": [
    { "id": 1, "name": "Item 1", "value": "abc", "category": "urgent" },
    { "id": 2, "name": "Item 2", "value": "def", "category": "normal" }
  ]
}
```

| Option | Description |
|--------|-------------|
| `array_path` | Path to the data array (e.g., `"items"` or `"data.results"`) |
| `display_fields` | Fields to show in each row (in order) |
| `copy_fields` | Fields available for copying (in order) |
| `color_rules` | Array of rules to highlight row numbers by color |

#### Color Rules

Each rule has: `field`, `operator` (`==`, `!=`, `contains`), `value`, and `color` (hex).

## License

MIT
